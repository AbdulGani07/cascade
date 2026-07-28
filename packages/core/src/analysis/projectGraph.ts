import fs from "node:fs";
import path from "node:path";
import type {
  DependencyNode,
  LanguagePlugin,
  ParseDiagnostic,
  ProjectGraph,
  ProjectImpactReport,
  ProjectInfo,
  ProjectRelationship,
} from "@cascade/plugin-api";
import { toPosixRelativePath } from "../utils/pathUtils.js";
import { detectCycles } from "../graph/cycleDetector.js";
import { detectProjects } from "./projectDetector.js";

export interface ProjectIntelligenceResult {
  projects: ProjectInfo[];
  projectGraph: ProjectGraph;
  diagnostics: ParseDiagnostic[];
  projectImpact: Record<string, ProjectImpactReport>;
}

export function detectProjectIntelligence(
  projectRoot: string,
  nodes: DependencyNode[],
  plugins: LanguagePlugin[] = []
): ProjectIntelligenceResult {
  const diagnostics: ParseDiagnostic[] = [];
  const base = detectProjects(projectRoot, nodes);
  const files = listRepositoryFiles(projectRoot);
  const customDetectors = plugins.flatMap((plugin) => plugin.projectDetectors ?? []);
  const detected = [...base];
  for (const detector of customDetectors.sort((left, right) => left.id.localeCompare(right.id))) {
    try {
      const output = detector.detectProject(projectRoot, files);
      if (output instanceof Promise) {
        diagnostics.push({
          file: projectRoot,
          message: `Project detector '${detector.id}' is asynchronous and was skipped by synchronous analysis.`,
          severity: "warning",
          code: "PROJECT_DETECTOR_ASYNC_UNSUPPORTED",
        });
      } else if (output) detected.push(...(Array.isArray(output) ? output : [output]));
    } catch (error) {
      diagnostics.push({
        file: projectRoot,
        message: `Project detector '${detector.id}' failed: ${(error as Error).message}`,
        severity: "warning",
        code: "PROJECT_DETECTOR_FAILURE",
      });
    }
  }
  const projects = normalizeProjects(projectRoot, detected, nodes, diagnostics);
  const edges = buildRelationships(projectRoot, projects, files, diagnostics);
  const projectGraph: ProjectGraph = {
    nodes: projects,
    edges,
    cycles: projectCycles(projects, edges),
    ...buildNavigationIndexes(projects),
  };
  return { projects, projectGraph, diagnostics, projectImpact: projectImpact(projects, edges) };
}

function normalizeProjects(
  projectRoot: string,
  candidates: ProjectInfo[],
  nodes: DependencyNode[],
  diagnostics: ParseDiagnostic[]
): ProjectInfo[] {
  const byId = new Map<string, ProjectInfo>();
  for (const candidate of candidates) {
    const id = candidate.id.replace(/\\/g, "/").replace(/^\.\/$/, "") || ".";
    const existing = byId.get(id);
    if (existing) {
      if (
        existing.buildSystem &&
        candidate.buildSystem &&
        existing.buildSystem !== candidate.buildSystem
      ) {
        diagnostics.push({
          file: id,
          message: `Conflicting project definitions for '${id}': ${existing.buildSystem} and ${candidate.buildSystem}.`,
          severity: "warning",
          code: "PROJECT_DEFINITION_CONFLICT",
        });
      }
      byId.set(id, mergeProject(existing, candidate));
    } else byId.set(id, { ...candidate, id, modules: [...(candidate.modules ?? [])] });
  }
  const projects = [...byId.values()].sort((left, right) => left.id.localeCompare(right.id));
  for (const project of projects) {
    const prefix = project.id === "." ? "" : `${project.id}/`;
    const nested = projects.filter(
      (candidate) => candidate.id !== project.id && candidate.id.startsWith(prefix)
    );
    project.parentProjectId = projects
      .filter(
        (candidate) =>
          candidate.id !== project.id &&
          project.id.startsWith(candidate.id === "." ? "" : `${candidate.id}/`)
      )
      .sort((left, right) => right.id.length - left.id.length)[0]?.id;
    project.files = nodes
      .filter((node) => {
        if (!node.relativePath.startsWith(prefix)) return false;
        return !nested.some((child) => node.relativePath.startsWith(`${child.id}/`));
      })
      .map((node) => node.relativePath)
      .sort();
    project.languages = [
      ...new Set(
        project.files
          .map((file) => nodes.find((node) => node.relativePath === file)?.language)
          .filter(Boolean) as string[]
      ),
    ].sort();
    project.rootPath = path.resolve(projectRoot, project.id === "." ? "" : project.id);
  }
  return projects;
}

function mergeProject(left: ProjectInfo, right: ProjectInfo): ProjectInfo {
  return {
    ...left,
    name: left.name || right.name,
    projectType: left.projectType === "node" ? right.projectType : left.projectType,
    languages: [...new Set([...left.languages, ...right.languages])].sort(),
    workspaces: [...left.workspaces, ...right.workspaces],
    configFiles: [...new Set([...left.configFiles, ...right.configFiles])].sort(),
    frameworks: [...new Set([...(left.frameworks ?? []), ...(right.frameworks ?? [])])].sort(),
    buildSystem: left.buildSystem ?? right.buildSystem,
    modules: [...(left.modules ?? []), ...(right.modules ?? [])],
    role:
      left.role === "infrastructure" && right.role && right.role !== "infrastructure"
        ? right.role
        : (left.role ?? right.role),
    deploymentUnits: [
      ...new Set([...(left.deploymentUnits ?? []), ...(right.deploymentUnits ?? [])]),
    ].sort(),
    detectionEvidence: [
      ...new Set([...(left.detectionEvidence ?? []), ...(right.detectionEvidence ?? [])]),
    ].sort(),
  };
}

function buildNavigationIndexes(
  projects: ProjectInfo[]
): Pick<ProjectGraph, "fileToProject" | "projectToFiles" | "groups"> {
  const projectToFiles = Object.fromEntries(
    projects.map((project) => [project.id, [...(project.files ?? [])].sort()])
  );
  const fileToProject = Object.fromEntries(
    projects.flatMap((project) => (project.files ?? []).map((file) => [file, project.id]))
  );
  const group = (values: Array<[string, string]>) => {
    const result: Record<string, string[]> = {};
    for (const [facet, project] of values) (result[facet] ??= []).push(project);
    for (const value of Object.values(result)) value.sort();
    return Object.fromEntries(
      Object.entries(result).sort(([left], [right]) => left.localeCompare(right))
    );
  };
  return {
    fileToProject,
    projectToFiles,
    groups: {
      byLanguage: group(
        projects.flatMap((project) =>
          project.languages.map((item) => [item, project.id] as [string, string])
        )
      ),
      byRole: group(projects.map((project) => [project.role ?? "unknown", project.id])),
      byBuildSystem: group(projects.map((project) => [project.buildSystem ?? "none", project.id])),
      byWorkspace: group(
        projects.map((project) => [project.parentProjectId ?? project.id, project.id])
      ),
    },
  };
}

function buildRelationships(
  projectRoot: string,
  projects: ProjectInfo[],
  files: string[],
  _diagnostics: ParseDiagnostic[]
): ProjectRelationship[] {
  const edges: ProjectRelationship[] = [];
  const edgeById = new Map<string, ProjectRelationship>();
  const byName = new Map(projects.map((project) => [project.name, project]));
  const byRoot = new Map(projects.map((project) => [project.id, project]));
  const add = (
    from: ProjectInfo,
    to: ProjectInfo | undefined,
    type: ProjectRelationship["type"],
    evidence: string,
    sourceFile: string,
    confidence = 1
  ) => {
    if (!to || from.id === to.id) return;
    const id = `${from.id} -> ${to.id} [${type}]`;
    const existing = edgeById.get(id);
    if (existing) {
      existing.evidence.push(evidence);
      existing.sourceFiles.push(sourceFile);
      return;
    }
    const edge = {
      id,
      from: from.id,
      to: to.id,
      type,
      confidence,
      evidence: [evidence],
      sourceFiles: [sourceFile],
    };
    edges.push(edge);
    edgeById.set(id, edge);
  };
  for (const project of projects) {
    const packagePath = path.join(project.rootPath, "package.json");
    const manifest = readJson(packagePath);
    if (manifest) {
      const addDependencies = (
        record: Record<string, string> | undefined,
        type: ProjectRelationship["type"],
        field: string
      ) => {
        for (const [name, value] of Object.entries(record ?? {})) {
          const target = byName.get(name) ?? workspacePathProject(project, value, byRoot);
          add(
            project,
            target,
            type,
            `${field} declares '${name}'`,
            toPosixRelativePath(packagePath, projectRoot)
          );
        }
      };
      addDependencies(
        asStringRecord(manifest.dependencies),
        "runtime-depends-on",
        "package.json dependencies"
      );
      addDependencies(
        asStringRecord(manifest.peerDependencies),
        "runtime-depends-on",
        "package.json peerDependencies"
      );
      addDependencies(
        asStringRecord(manifest.devDependencies),
        "test-depends-on",
        "package.json devDependencies"
      );
      for (const workspace of workspacePatterns(manifest.workspaces)) {
        for (const target of projects.filter(
          (candidate) => candidate.id !== project.id && globPrefixMatch(candidate.id, workspace)
        ))
          add(
            project,
            target,
            "packages",
            `package.json workspaces '${workspace}'`,
            toPosixRelativePath(packagePath, projectRoot)
          );
      }
    }
    for (const module of project.modules ?? []) {
      const target = projectAtPath(module.relativePath, byRoot);
      add(
        project,
        target,
        "references",
        `${project.buildSystem ?? "build"} module '${module.name}'`,
        project.configFiles[0] ?? project.id,
        0.9
      );
    }
    const configFiles = project.configFiles.map((file) => path.join(projectRoot, file));
    for (const configFile of configFiles) {
      const content = readText(configFile);
      const relative = toPosixRelativePath(configFile, projectRoot);
      const configName = path.basename(configFile);
      const addPathReference = (
        rawPath: string,
        type: ProjectRelationship["type"],
        label: string
      ) => {
        const normalized = rawPath.replace(/\\/g, "/").replace(/\.(?:csproj|fsproj|vbproj)$/, "");
        const target = projectAtPath(
          path.posix.normalize(path.posix.join(path.posix.dirname(relative), normalized)),
          byRoot
        );
        add(project, target, type, `${label} '${rawPath}'`, relative, 0.95);
      };
      if (configName.endsWith(".csproj"))
        for (const match of content.matchAll(/<ProjectReference\s+Include="([^"]+)"/g))
          addPathReference(match[1], "build-depends-on", "MSBuild ProjectReference");
      if (configName === "pom.xml")
        for (const match of content.matchAll(/<module>\s*([^<]+)\s*<\/module>/g))
          addPathReference(match[1], "packages", "Maven module");
      if (/^(?:settings\.)?gradle(?:\.kts)?$/.test(configName))
        for (const match of content.matchAll(/include\s*\(?\s*["']:?([^"']+)["']/g))
          addPathReference(match[1].replace(/:/g, "/"), "packages", "Gradle included project");
      if (configName === "go.work")
        for (const use of extractGoWorkUses(content))
          addPathReference(use, "workspace-depends-on", "go.work use");
      if (configName === "Cargo.toml") {
        const members =
          /\[workspace\][\s\S]*?members\s*=\s*\[([\s\S]*?)\]/m.exec(content)?.[1] ?? "";
        for (const match of members.matchAll(/"([^"]+)"/g))
          addPathReference(match[1], "packages", "Cargo workspace member");
        for (const match of content.matchAll(
          /(?:^|\n)\s*[\w-]+\s*=\s*\{[^}\n]*path\s*=\s*"([^"]+)"/g
        ))
          addPathReference(match[1], "build-depends-on", "Cargo path dependency");
      }
      if (configName === "CMakeLists.txt")
        for (const match of content.matchAll(/add_subdirectory\s*\(\s*([^\s)]+)/gi))
          addPathReference(match[1], "build-depends-on", "CMake add_subdirectory");
      if (configName === "meson.build")
        for (const match of content.matchAll(/subdir\s*\(\s*['"]([^'"]+)/g))
          addPathReference(match[1], "build-depends-on", "Meson subdir");
      for (const extend of extractExtends(content))
        add(
          project,
          projectAtPath(
            path.posix.normalize(path.posix.join(path.posix.dirname(relative), extend)),
            byRoot
          ),
          "extends-configuration",
          `configuration extends '${extend}'`,
          relative,
          0.9
        );
      if (/Dockerfile|docker-compose|compose\.ya?ml/i.test(path.basename(configFile)))
        project.deploymentUnits = [...new Set([...(project.deploymentUnits ?? []), "container"])];
    }
  }
  for (const file of files) {
    const owner = owningProject(file, projects);
    if (!owner) continue;
    const content = readText(path.join(projectRoot, file));
    for (const extend of extractExtends(content)) {
      const target = projectAtPath(
        path.posix.normalize(path.posix.join(path.posix.dirname(file), extend)),
        byRoot
      );
      add(owner, target, "extends-configuration", `configuration extends '${extend}'`, file, 0.9);
    }
    if (/(?:^|\n)\s*module\s+"[^"]+"\s*\{/m.test(content)) {
      for (const source of [...content.matchAll(/source\s*=\s*"([^"]+)"/g)].map(
        (match) => match[1]
      )) {
        if (!source.startsWith(".")) continue;
        add(
          owner,
          projectAtPath(path.posix.join(path.posix.dirname(file), source), byRoot),
          "references",
          `Terraform module source '${source}'`,
          file,
          0.9
        );
      }
    }
    if (/(?:^|\/)(?:\.github\/workflows|\.gitlab-ci\.ya?ml|azure-pipelines\.ya?ml)/.test(file)) {
      owner.deploymentUnits = [...new Set([...(owner.deploymentUnits ?? []), "ci-pipeline"])];
    }
    if (/^\s*(?:FROM|image:)\s+/m.test(content) && /(?:Dockerfile|compose|\.ya?ml)$/i.test(file)) {
      owner.deploymentUnits = [
        ...new Set([...(owner.deploymentUnits ?? []), "container-orchestrated"]),
      ];
      for (const target of projects.filter(
        (project) =>
          project.id !== owner.id &&
          new RegExp(`(?:service|image):\\s*${escapeRegExp(project.name)}`, "i").test(content)
      ))
        add(owner, target, "deploys", "deployment configuration names target project", file, 0.75);
    }
    if (/(?:^|\/)(?:generated|gen|build|dist)\//.test(file)) {
      const generator = owningProject(file, projects);
      if (generator)
        generator.deploymentUnits = [
          ...new Set([...(generator.deploymentUnits ?? []), "generated-output"]),
        ];
    }
    if (/(?:^|\/)(?:Dockerfile|docker-compose|compose\.ya?ml)$/i.test(file)) {
      for (const buildContext of [
        ...content.matchAll(/(?:build:\s*|context:\s*)["']?(\.\.?\/[^"'#\s]+)/g),
      ].map((match) => match[1])) {
        const target = projectAtPath(
          path.posix.normalize(path.posix.join(path.posix.dirname(file), buildContext)),
          byRoot
        );
        add(owner, target, "packages", `container build context '${buildContext}'`, file, 0.9);
      }
    }
    if (/(?:^|\/)(?:\.github\/workflows\/.+|\.gitlab-ci|azure-pipelines)\.ya?ml$/i.test(file)) {
      for (const workingDirectory of [
        ...content.matchAll(/working-directory:\s*["']?([^"'#\s]+)/g),
      ].map((match) => match[1]))
        add(
          owner,
          projectAtPath(workingDirectory, byRoot),
          "deploys",
          `CI working-directory '${workingDirectory}'`,
          file,
          0.85
        );
    }
  }
  return edges
    .map((edge) => ({
      ...edge,
      evidence: [...new Set(edge.evidence)].sort(),
      sourceFiles: [...new Set(edge.sourceFiles)].sort(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

function extractGoWorkUses(content: string): string[] {
  const single = [...content.matchAll(/^\s*use\s+([^\s(][^\s]*)/gm)].map((match) => match[1]);
  const blocks = [...content.matchAll(/use\s*\(([\s\S]*?)\)/g)].flatMap((match) =>
    match[1]
      .split(/\r?\n/)
      .map((line) => line.replace(/\/\/.*$/, "").trim())
      .filter(Boolean)
  );
  return [...new Set([...single, ...blocks])].sort();
}

function projectCycles(projects: ProjectInfo[], edges: ProjectRelationship[]): string[][] {
  const outgoing = new Map(projects.map((project) => [project.id, [] as string[]]));
  const incoming = new Map(projects.map((project) => [project.id, [] as string[]]));
  for (const edge of edges) {
    outgoing.get(edge.from)?.push(edge.to);
    incoming.get(edge.to)?.push(edge.from);
  }
  return detectCycles({
    nodes: new Map(),
    edges: [],
    neighborsOf: (id) => outgoing.get(id) ?? [],
    incomingTo: (id) => incoming.get(id) ?? [],
  });
}

function projectImpact(
  projects: ProjectInfo[],
  edges: ProjectRelationship[]
): Record<string, ProjectImpactReport> {
  const incoming = new Map(projects.map((project) => [project.id, [] as string[]]));
  const byId = new Map(projects.map((project) => [project.id, project]));
  for (const edge of edges) incoming.get(edge.to)?.push(edge.from);
  return Object.fromEntries(
    projects.map((project) => {
      const seen = new Set([project.id]);
      const queue = [project.id];
      for (let index = 0; index < queue.length; index++)
        for (const dependent of incoming.get(queue[index]) ?? [])
          if (!seen.has(dependent)) {
            seen.add(dependent);
            queue.push(dependent);
          }
      const affected = [...seen].filter((id) => id !== project.id).sort();
      const files = affected.flatMap((id) => byId.get(id)?.files ?? []).sort();
      return [
        project.id,
        {
          target: project.id,
          directlyAffected: [...(incoming.get(project.id) ?? [])].sort(),
          allAffected: affected,
          affectedFiles: files,
        },
      ];
    })
  );
}

function listRepositoryFiles(root: string): string[] {
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
      if (entry.isDirectory()) {
        if (!ignored.has(entry.name)) visit(path.join(directory, entry.name), depth + 1);
      } else if (entry.isFile())
        result.push(toPosixRelativePath(path.join(directory, entry.name), root));
    }
  };
  visit(root, 0);
  return result.sort();
}

function owningProject(file: string, projects: ProjectInfo[]): ProjectInfo | undefined {
  return projects
    .filter((project) => file.startsWith(project.id === "." ? "" : `${project.id}/`))
    .sort((left, right) => right.id.length - left.id.length)[0];
}
function projectAtPath(
  relativePath: string,
  projects: Map<string, ProjectInfo>
): ProjectInfo | undefined {
  const normalized = relativePath
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/\/[^/]+$/, "");
  return projects.get(normalized) ?? projects.get(relativePath.replace(/\\/g, "/"));
}
function workspacePathProject(
  project: ProjectInfo,
  value: string,
  projects: Map<string, ProjectInfo>
): ProjectInfo | undefined {
  if (!value.startsWith(".") && !value.startsWith("workspace:")) return undefined;
  const relative = value.startsWith("workspace:") ? value.slice("workspace:".length) : value;
  return projectAtPath(path.posix.join(project.id === "." ? "" : project.id, relative), projects);
}
function workspacePatterns(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : Array.isArray((value as { packages?: unknown })?.packages)
      ? (value as { packages: unknown[] }).packages.filter(
          (item): item is string => typeof item === "string"
        )
      : [];
}
function globPrefixMatch(value: string, pattern: string): boolean {
  return pattern.endsWith("/*") ? value.startsWith(pattern.slice(0, -1)) : value === pattern;
}
function extractExtends(content: string): string[] {
  return [...content.matchAll(/(?:"extends"\s*:\s*|extends\s+)["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((item) => item.startsWith("."));
}
function readJson(
  file: string
): Record<string, Record<string, string> | string | unknown> | undefined {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Record<
      string,
      Record<string, string> | string | unknown
    >;
  } catch {
    return undefined;
  }
}
function readText(file: string): string {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}
function asStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(([, item]) => typeof item === "string")
  ) as Record<string, string>;
}
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
