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
  return projects;
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
