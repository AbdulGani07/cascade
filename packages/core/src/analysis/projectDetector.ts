import fs from "node:fs";
import path from "node:path";
import { DependencyNode, ProjectInfo, WorkspacePackage } from "@cascade/plugin-api";
import { toPosixRelativePath } from "../utils/pathUtils.js";

export function detectProjects(projectRoot: string, nodes: DependencyNode[]): ProjectInfo[] {
  const manifests = new Set<string>([path.join(projectRoot, "package.json")]);
  for (const node of nodes) {
    if (path.posix.basename(node.relativePath) === "package.json") manifests.add(node.absolutePath);
  }

  const workspaces: WorkspacePackage[] = [];
  const projects: ProjectInfo[] = [];
  for (const manifestPath of manifests) {
    const manifest = readJson(manifestPath);
    if (!manifest) continue;
    const rootPath = path.dirname(manifestPath);
    const relativeRoot = toPosixRelativePath(rootPath, projectRoot);
    const dependencies = {
      ...(manifest.dependencies ?? {}),
      ...(manifest.devDependencies ?? {}),
    };
    const frameworks = detectFrameworks(dependencies, nodes);
    const workspace: WorkspacePackage = {
      name: manifest.name ?? (relativeRoot || path.basename(projectRoot)),
      path: rootPath,
      relativePath: relativeRoot,
      manifestPath,
      dependencies,
    };
    workspaces.push(workspace);

    projects.push({
      id: relativeRoot || ".",
      name: workspace.name,
      rootPath,
      projectType: classifyProject(manifest, frameworks),
      languages: detectLanguages(nodes, relativeRoot),
      workspaces: [],
      configFiles: nodes
        .filter((node) =>
          node.relativePath.startsWith(relativeRoot === "." ? "" : `${relativeRoot}/`)
        )
        .map((node) => node.relativePath)
        .filter((file) =>
          /(^|\/)(tsconfig.*\.json|vite\.config\.|next\.config\.|nx\.json|turbo\.json)/.test(file)
        ),
      frameworks,
    });
  }

  const root = projects.find((project) => project.id === ".");
  if (root) root.workspaces = workspaces.filter((workspace) => workspace.relativePath !== ".");
  const pythonProjects = detectPythonProjects(projectRoot, nodes);
  for (const pythonProject of pythonProjects) {
    const existing = projects.find((project) => project.id === pythonProject.id);
    if (existing) {
      existing.languages = [...new Set([...existing.languages, "python"])];
      existing.frameworks = [
        ...new Set([...(existing.frameworks ?? []), ...(pythonProject.frameworks ?? [])]),
      ];
      existing.configFiles = [...new Set([...existing.configFiles, ...pythonProject.configFiles])];
    } else projects.push(pythonProject);
  }
  for (const project of detectCompiledProjects(projectRoot, nodes)) {
    const existing = projects.find((candidate) => candidate.id === project.id);
    if (!existing) projects.push(project);
    else {
      existing.languages = [...new Set([...existing.languages, ...project.languages])];
      existing.configFiles = [...new Set([...existing.configFiles, ...project.configFiles])];
      existing.frameworks = [
        ...new Set([...(existing.frameworks ?? []), ...(project.frameworks ?? [])]),
      ];
      existing.buildSystem =
        existing.buildSystem && existing.buildSystem !== project.buildSystem
          ? "mixed"
          : project.buildSystem;
      existing.modules = [...(existing.modules ?? []), ...(project.modules ?? [])];
    }
  }
  return projects;
}

function detectCompiledProjects(projectRoot: string, nodes: DependencyNode[]): ProjectInfo[] {
  const manifests = findBuildManifests(projectRoot);
  return manifests.flatMap((manifestPath): ProjectInfo[] => {
    const name = path.basename(manifestPath);
    const rootPath = path.dirname(manifestPath);
    const id = toPosixRelativePath(rootPath, projectRoot) || ".";
    const relativeManifest = toPosixRelativePath(manifestPath, projectRoot);
    const prefix = id === "." ? "" : `${id}/`;
    const languages = [
      ...new Set(
        nodes.filter((node) => node.relativePath.startsWith(prefix)).map((node) => node.language)
      ),
    ].filter((language) => language !== "unknown");
    if (/^(settings\.)?gradle(?:\.kts)?$/.test(name) || name === "pom.xml") {
      const content = safeRead(manifestPath);
      const modules =
        name === "pom.xml"
          ? [...content.matchAll(/<module>\s*([^<]+)\s*<\/module>/g)].map((match) => ({
              name: match[1],
              relativePath: `${prefix}${match[1]}`,
            }))
          : [...content.matchAll(/include\s*\(?\s*["']:?([^"']+)["']/g)].map((match) => ({
              name: match[1],
              relativePath: `${prefix}${match[1].replace(/:/g, "/")}`,
            }));
      const frameworks = /spring-boot/i.test(content)
        ? ["Spring Boot"]
        : /com\.android\./.test(content)
          ? ["Android"]
          : [];
      return [
        {
          id,
          name: path.basename(rootPath),
          rootPath,
          projectType: frameworks.includes("Android") ? "android" : "jvm",
          languages,
          workspaces: [],
          configFiles: [relativeManifest],
          frameworks,
          buildSystem: name === "pom.xml" ? "maven" : "gradle",
          modules,
        },
      ];
    }
    if (name.endsWith(".csproj") || name.endsWith(".sln")) {
      const content = safeRead(manifestPath);
      const modules = name.endsWith(".sln")
        ? [...content.matchAll(/Project\([^)]*\)\s*=\s*"([^"]+)",\s*"([^"]+\.csproj)"/g)].map(
            (match) => ({
              name: match[1],
              relativePath: `${prefix}${match[2].replace(/\\/g, "/")}`,
            })
          )
        : [...content.matchAll(/<ProjectReference\s+Include="([^"]+)"/g)].map((match) => ({
            name: path.basename(match[1], ".csproj"),
            relativePath: `${prefix}${match[1].replace(/\\/g, "/")}`,
          }));
      const frameworks = /Microsoft\.NET\.Sdk\.Web/.test(content) ? ["ASP.NET Core"] : [];
      return [
        {
          id,
          name: path.basename(rootPath),
          rootPath,
          projectType: frameworks.length ? "aspnet-core" : "dotnet",
          languages,
          workspaces: [],
          configFiles: [relativeManifest],
          frameworks,
          buildSystem: "dotnet",
          modules,
        },
      ];
    }
    if (name === "go.mod" || name === "go.work") {
      const content = safeRead(manifestPath);
      const moduleName = /^module\s+(\S+)/m.exec(content)?.[1] ?? path.basename(rootPath);
      const modules = [...content.matchAll(/(?:^|\n)\s*use\s+(?:\(\s*)?([^\s)]+)/g)].map(
        (match) => ({ name: path.basename(match[1]), relativePath: `${prefix}${match[1]}` })
      );
      return [
        {
          id,
          name: moduleName,
          rootPath,
          projectType: name === "go.work" ? "go-workspace" : "go-module",
          languages,
          workspaces: [],
          configFiles: [relativeManifest],
          frameworks: [],
          buildSystem: "go",
          modules,
        },
      ];
    }
    if (name === "Cargo.toml") {
      const content = safeRead(manifestPath);
      const packageName =
        /\[package\][\s\S]*?^name\s*=\s*"([^"]+)"/m.exec(content)?.[1] ?? path.basename(rootPath);
      const membersBlock = /\[workspace\][\s\S]*?members\s*=\s*\[([\s\S]*?)\]/m.exec(content)?.[1];
      const modules = [...(membersBlock ?? "").matchAll(/"([^"]+)"/g)].map((match) => ({
        name: path.basename(match[1]),
        relativePath: `${prefix}${match[1]}`,
        kind: "cargo-workspace-member",
      }));
      return [
        {
          id,
          name: packageName,
          rootPath,
          projectType: membersBlock ? "cargo-workspace" : "rust-crate",
          languages,
          workspaces: [],
          configFiles: [relativeManifest],
          frameworks: [],
          buildSystem: "cargo",
          modules,
        },
      ];
    }
    if (
      [
        "CMakeLists.txt",
        "Makefile",
        "makefile",
        "meson.build",
        "BUILD",
        "BUILD.bazel",
        "WORKSPACE",
      ].includes(name)
    ) {
      const buildSystem =
        name === "CMakeLists.txt"
          ? "cmake"
          : name === "meson.build"
            ? "meson"
            : /^(BUILD|WORKSPACE)/.test(name)
              ? "bazel"
              : "make";
      const content = safeRead(manifestPath);
      const modules =
        buildSystem === "cmake"
          ? [...content.matchAll(/add_subdirectory\s*\(\s*([^\s)]+)/gi)].map((match) => ({
              name: path.basename(match[1]),
              relativePath: `${prefix}${match[1]}`,
              kind: "cmake-subdirectory",
            }))
          : buildSystem === "meson"
            ? [...content.matchAll(/subdir\s*\(\s*['"]([^'"]+)/g)].map((match) => ({
                name: path.basename(match[1]),
                relativePath: `${prefix}${match[1]}`,
                kind: "meson-subdirectory",
              }))
            : buildSystem === "bazel"
              ? [
                  ...content.matchAll(
                    /(?:cc_library|cc_binary|cc_test)\s*\(\s*name\s*=\s*"([^"]+)"/g
                  ),
                ].map((match) => ({
                  name: match[1],
                  relativePath: prefix || ".",
                  kind: "bazel-target",
                }))
              : [];
      return [
        {
          id,
          name: path.basename(rootPath),
          rootPath,
          projectType: `${buildSystem}-native`,
          languages,
          workspaces: [],
          configFiles: [relativeManifest],
          frameworks: [],
          buildSystem,
          modules,
        },
      ];
    }
    return [];
  });
}

function findBuildManifests(projectRoot: string): string[] {
  const result: string[] = [];
  const ignored = new Set([
    ".git",
    "node_modules",
    "dist",
    "build",
    "target",
    "bin",
    "obj",
    ".gradle",
  ]);
  const visit = (directory: string, depth: number) => {
    if (depth > 5) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory() && !ignored.has(entry.name))
        visit(path.join(directory, entry.name), depth + 1);
      else if (
        entry.isFile() &&
        ([
          "pom.xml",
          "build.gradle",
          "build.gradle.kts",
          "settings.gradle",
          "settings.gradle.kts",
          "go.mod",
          "go.work",
          "Cargo.toml",
          "CMakeLists.txt",
          "Makefile",
          "makefile",
          "meson.build",
          "BUILD",
          "BUILD.bazel",
          "WORKSPACE",
        ].includes(entry.name) ||
          /\.(?:csproj|sln)$/.test(entry.name))
      )
        result.push(path.join(directory, entry.name));
    }
  };
  visit(projectRoot, 0);
  return result;
}

function safeRead(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function detectPythonProjects(projectRoot: string, nodes: DependencyNode[]): ProjectInfo[] {
  if (!nodes.some((node) => node.language === "python")) return [];
  const configs = ["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt"].filter((name) =>
    fs.existsSync(path.join(projectRoot, name))
  );
  const metadata = configs
    .map((name) => {
      try {
        return fs.readFileSync(path.join(projectRoot, name), "utf8");
      } catch {
        return "";
      }
    })
    .join("\n")
    .toLowerCase();
  const frameworks: string[] = [];
  if (metadata.includes("django") || fs.existsSync(path.join(projectRoot, "manage.py")))
    frameworks.push("Django");
  if (metadata.includes("fastapi")) frameworks.push("FastAPI");
  if (metadata.includes("flask")) frameworks.push("Flask");
  const manager = metadata.includes("[tool.poetry")
    ? "poetry"
    : metadata.includes("[tool.uv")
      ? "uv"
      : metadata.includes("[tool.pdm")
        ? "pdm"
        : "pip";
  const projectType = frameworks[0]?.toLowerCase() ?? `python-${manager}`;
  return [
    {
      id: ".",
      name: path.basename(projectRoot),
      rootPath: projectRoot,
      projectType,
      languages: ["python"],
      workspaces: [],
      configFiles: configs,
      frameworks,
    },
  ];
}

function detectFrameworks(dependencies: Record<string, string>, nodes: DependencyNode[]): string[] {
  const frameworks: string[] = [];
  const has = (name: string) => name in dependencies;
  if (has("react")) frameworks.push("React");
  if (has("vite")) frameworks.push("Vite");
  if (has("next")) frameworks.push("Next.js");
  if (has("express")) frameworks.push("Express");
  if (has("@nestjs/core")) frameworks.push("NestJS");
  if (has("turbo") || nodes.some((node) => node.relativePath === "turbo.json"))
    frameworks.push("Turborepo");
  if (has("nx") || nodes.some((node) => node.relativePath === "nx.json")) frameworks.push("Nx");
  return frameworks;
}

// Package manifests are open-ended JSON objects supplied by users.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function classifyProject(manifest: any, frameworks: string[]): string {
  if (frameworks.includes("Next.js")) return "nextjs";
  if (frameworks.includes("NestJS")) return "nestjs";
  if (frameworks.includes("Vite")) return "vite";
  if (frameworks.includes("Express")) return "express";
  if (manifest.workspaces) return "monorepo";
  if (manifest.types || manifest.typings) return "typescript-library";
  return "node";
}

function detectLanguages(nodes: DependencyNode[], relativeRoot: string): string[] {
  const prefix = relativeRoot === "." ? "" : `${relativeRoot}/`;
  return [
    ...new Set(
      nodes.filter((node) => node.relativePath.startsWith(prefix)).map((node) => node.language)
    ),
  ].filter((language) => language !== "unknown");
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJson(filePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return undefined;
  }
}
