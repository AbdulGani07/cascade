import fs from "node:fs";
import path from "node:path";
import { DependencyNode, ProjectInfo, WorkspacePackage } from "@cascade/plugin-api";
import { toPosixRelativePath } from "../utils/pathUtils.js";

export function detectProjects(projectRoot: string, nodes: DependencyNode[]): ProjectInfo[] {
  const manifests = new Set<string>([path.join(projectRoot, "package.json")]);
  for (const manifest of findManifestFiles(projectRoot, new Set(["package.json"])))
    manifests.add(manifest);
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
      buildSystem: detectNodeBuildSystem(rootPath, manifest),
      role: inferNodeRole(manifest, frameworks, relativeRoot),
      detectionEvidence: [toPosixRelativePath(manifestPath, projectRoot)],
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
      existing.detectionEvidence = [
        ...new Set([...(existing.detectionEvidence ?? []), ...(project.detectionEvidence ?? [])]),
      ];
    }
  }
  for (const project of detectInfrastructureProjects(projectRoot)) {
    const existing = projects.find((candidate) => candidate.id === project.id);
    if (!existing) projects.push(project);
    else {
      existing.configFiles = [...new Set([...existing.configFiles, ...project.configFiles])].sort();
      existing.deploymentUnits = [
        ...new Set([...(existing.deploymentUnits ?? []), ...(project.deploymentUnits ?? [])]),
      ].sort();
      existing.detectionEvidence = [
        ...new Set([...(existing.detectionEvidence ?? []), ...(project.detectionEvidence ?? [])]),
      ].sort();
    }
  }
  return projects;
}

function detectInfrastructureProjects(projectRoot: string): ProjectInfo[] {
  const names = new Set([
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    "compose.yml",
    "compose.yaml",
    "main.tf",
    "terragrunt.hcl",
    ".gitlab-ci.yml",
    ".gitlab-ci.yaml",
    "azure-pipelines.yml",
    "cloudbuild.yaml",
  ]);
  const manifests = findManifestFiles(projectRoot, names).filter(
    (file) =>
      names.has(path.basename(file)) ||
      /(?:^|[\\/])\.github[\\/]workflows[\\/].+\.ya?ml$/i.test(file) ||
      /(?:^|[\\/])(?:k8s|kubernetes|deploy|helm)[\\/].+\.ya?ml$/i.test(file)
  );
  const byRoot = new Map<string, string[]>();
  for (const manifest of manifests) {
    const directory = path.dirname(manifest);
    const relative = toPosixRelativePath(manifest, projectRoot);
    const bucket = byRoot.get(directory) ?? [];
    bucket.push(relative);
    byRoot.set(directory, bucket);
  }
  return [...byRoot.entries()].map(([rootPath, configFiles]) => {
    const id = toPosixRelativePath(rootPath, projectRoot) || ".";
    const units = configFiles.flatMap((file) =>
      /Dockerfile|compose/i.test(file)
        ? ["container"]
        : /\.tf$|terragrunt/.test(file)
          ? ["terraform-module"]
          : /\.github\/workflows|gitlab-ci|pipelines|cloudbuild/.test(file)
            ? ["ci-pipeline"]
            : ["kubernetes"]
    );
    return {
      id,
      name: id === "." ? path.basename(projectRoot) : path.basename(rootPath),
      rootPath,
      projectType: "infrastructure",
      languages: [],
      workspaces: [],
      configFiles: [...new Set(configFiles)].sort(),
      frameworks: [],
      role: "infrastructure",
      deploymentUnits: [...new Set(units)].sort(),
      detectionEvidence: [...new Set(configFiles)].sort(),
    };
  });
}

function findManifestFiles(projectRoot: string, names: Set<string>): string[] {
  const result: string[] = [];
  const ignored = new Set([
    ".git",
    "node_modules",
    ".pnpm",
    "dist",
    "build",
    "target",
    "vendor",
    ".venv",
  ]);
  const visit = (directory: string, depth: number) => {
    if (depth > 8) return;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) visit(full, depth + 1);
      } else if (entry.isFile() && names.has(entry.name)) result.push(full);
    }
  };
  visit(projectRoot, 0);
  return result.sort();
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
          role: frameworks.includes("Android")
            ? "application"
            : modules.length
              ? "workspace"
              : "library",
          detectionEvidence: [relativeManifest],
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
          role: frameworks.length ? "service" : name.endsWith(".sln") ? "workspace" : "library",
          detectionEvidence: [relativeManifest],
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
          role: name === "go.work" ? "workspace" : "module",
          detectionEvidence: [relativeManifest],
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
          role: membersBlock ? "workspace" : "library",
          detectionEvidence: [relativeManifest],
        },
      ];
    }
    const expandedBuildSystems = {
      "composer.json": ["composer", "php-composer"],
      Gemfile: ["bundler", "ruby-bundler"],
      "Package.swift": ["swiftpm", "swift-package"],
      "pubspec.yaml": ["dart", "dart-package"],
      "renv.lock": ["r", "r-project"],
      "svelte.config.js": ["vite", "sveltekit"],
      "nuxt.config.ts": ["vite", "nuxt"],
      "turbo.json": ["turbo", "turborepo"],
      "nx.json": ["nx", "nx-workspace"],
      "rush.json": ["rush", "rush-monorepo"],
      "lerna.json": ["lerna", "lerna-monorepo"],
    } as const;
    if (name in expandedBuildSystems) {
      const [buildSystem, projectType] =
        expandedBuildSystems[name as keyof typeof expandedBuildSystems];
      return [
        {
          id,
          name: path.basename(rootPath),
          rootPath,
          projectType,
          languages,
          workspaces: [],
          configFiles: [relativeManifest],
          frameworks: projectType.includes("svelte")
            ? ["SvelteKit"]
            : projectType.includes("nuxt")
              ? ["Nuxt"]
              : [],
          buildSystem,
          modules: [],
          role: projectType.includes("monorepo") ? "workspace" : "application",
          detectionEvidence: [relativeManifest],
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
          role: modules.length ? "workspace" : "library",
          detectionEvidence: [relativeManifest],
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
          "composer.json",
          "Gemfile",
          "Package.swift",
          "pubspec.yaml",
          "renv.lock",
          "svelte.config.js",
          "nuxt.config.ts",
          "turbo.json",
          "nx.json",
          "rush.json",
          "lerna.json",
        ].includes(entry.name) ||
          /\.(?:csproj|sln)$/.test(entry.name))
      )
        result.push(path.join(directory, entry.name));
    }
  };
  visit(projectRoot, 0);
  return result.sort();
}

function safeRead(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function detectPythonProjects(projectRoot: string, nodes: DependencyNode[]): ProjectInfo[] {
  const manifests = findManifestFiles(
    projectRoot,
    new Set(["pyproject.toml", "setup.py", "setup.cfg"])
  );
  return manifests.map((manifestPath) => {
    const rootPath = path.dirname(manifestPath);
    const id = toPosixRelativePath(rootPath, projectRoot) || ".";
    const localConfigs = ["pyproject.toml", "setup.py", "setup.cfg", "requirements.txt"].filter(
      (name) => fs.existsSync(path.join(rootPath, name))
    );
    const metadata = localConfigs.map((name) => safeRead(path.join(rootPath, name))).join("\n");
    const lower = metadata.toLowerCase();
    const frameworks: string[] = [];
    if (lower.includes("django") || fs.existsSync(path.join(rootPath, "manage.py")))
      frameworks.push("Django");
    if (lower.includes("fastapi")) frameworks.push("FastAPI");
    if (lower.includes("flask")) frameworks.push("Flask");
    const manager = lower.includes("[tool.poetry")
      ? "poetry"
      : lower.includes("[tool.uv")
        ? "uv"
        : lower.includes("[tool.pdm")
          ? "pdm"
          : lower.includes("[tool.hatch")
            ? "hatch"
            : "pip";
    const declaredName =
      /(?:^|\n)\s*name\s*=\s*["']([^"']+)/m.exec(metadata)?.[1] ?? path.basename(rootPath);
    const relativeConfigs = localConfigs.map((name) =>
      toPosixRelativePath(path.join(rootPath, name), projectRoot)
    );
    return {
      id,
      name: declaredName,
      rootPath,
      projectType: frameworks[0]?.toLowerCase() ?? `python-${manager}`,
      languages: detectLanguages(nodes, id),
      workspaces: [],
      configFiles: relativeConfigs,
      frameworks,
      buildSystem: "python" as const,
      role: frameworks.length ? ("service" as const) : ("library" as const),
      detectionEvidence: [toPosixRelativePath(manifestPath, projectRoot)],
    };
  });
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

function detectNodeBuildSystem(
  rootPath: string,
  manifest: Record<string, unknown>
): ProjectInfo["buildSystem"] {
  const packageManager = typeof manifest.packageManager === "string" ? manifest.packageManager : "";
  if (
    packageManager.startsWith("pnpm") ||
    fs.existsSync(path.join(rootPath, "pnpm-workspace.yaml"))
  )
    return "pnpm";
  if (packageManager.startsWith("yarn") || fs.existsSync(path.join(rootPath, "yarn.lock")))
    return "yarn";
  if (fs.existsSync(path.join(rootPath, "nx.json"))) return "nx";
  if (fs.existsSync(path.join(rootPath, "turbo.json"))) return "turbo";
  if (fs.existsSync(path.join(rootPath, "rush.json"))) return "rush";
  if (fs.existsSync(path.join(rootPath, "lerna.json"))) return "lerna";
  return "npm";
}

function inferNodeRole(
  manifest: Record<string, unknown>,
  frameworks: string[],
  relativeRoot: string
): ProjectInfo["role"] {
  if (manifest.workspaces || relativeRoot === ".") return "workspace";
  if (frameworks.some((item) => ["Next.js", "NestJS", "Express"].includes(item))) return "service";
  if (manifest.private !== true && (manifest.types || manifest.typings || manifest.exports))
    return "library";
  return "application";
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
