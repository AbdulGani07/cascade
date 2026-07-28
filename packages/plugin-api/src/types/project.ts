/** Project detection and workspace metadata interfaces. */

export interface WorkspacePackage {
  name: string;
  path: string;
  relativePath: string;
  manifestPath?: string;
  dependencies?: Record<string, string>;
}

export interface ProjectInfo {
  id: string;
  name: string;
  rootPath: string;
  projectType: string; // e.g. "node", "monorepo", "python-pip", "go-module"
  languages: string[];
  workspaces: WorkspacePackage[];
  configFiles: string[];
  frameworks?: string[];
  /** Build ecosystem inferred from structured manifests. */
  buildSystem?:
    | "npm"
    | "pnpm"
    | "yarn"
    | "maven"
    | "gradle"
    | "dotnet"
    | "go"
    | "python"
    | "cargo"
    | "cmake"
    | "make"
    | "meson"
    | "bazel"
    | "composer"
    | "bundler"
    | "swiftpm"
    | "dart"
    | "shell"
    | "powershell"
    | "r"
    | "vite"
    | "nx"
    | "turbo"
    | "rush"
    | "lerna"
    | "mixed";
  /** Logical modules/projects declared by the build system. */
  modules?: Array<{ name: string; relativePath: string; kind?: string }>;
  /** Parent workspace or enclosing project, when evidenced by a manifest. */
  parentProjectId?: string;
  /** Source units belonging directly to this project after nested-project ownership is removed. */
  files?: string[];
  /** High-level deployment classification inferred from explicit configuration. */
  deploymentUnits?: string[];
  /** Semantic role inferred only from manifests, layout conventions, or an override. */
  role?:
    | "repository"
    | "workspace"
    | "application"
    | "library"
    | "service"
    | "test"
    | "infrastructure"
    | "deployment"
    | "module"
    | "unknown";
  /** Manifest/configuration evidence that caused this project to exist. */
  detectionEvidence?: string[];
}

export type ProjectRelationshipKind =
  | "workspace-depends-on"
  | "build-depends-on"
  | "runtime-depends-on"
  | "test-depends-on"
  | "generates"
  | "deploys"
  | "packages"
  | "references"
  | "extends-configuration";

export interface ProjectRelationship {
  id: string;
  from: string;
  to: string;
  type: ProjectRelationshipKind;
  confidence: number;
  evidence: string[];
  sourceFiles: string[];
}

export interface ProjectGraph {
  nodes: ProjectInfo[];
  edges: ProjectRelationship[];
  cycles: string[][];
  /** Bidirectional bridge between the project graph and file graph. */
  fileToProject: Record<string, string>;
  projectToFiles: Record<string, string[]>;
  /** Deterministic facets used by CLI and dashboards. */
  groups: {
    byLanguage: Record<string, string[]>;
    byRole: Record<string, string[]>;
    byBuildSystem: Record<string, string[]>;
    byWorkspace: Record<string, string[]>;
  };
}

export interface ProjectImpactReport {
  target: string;
  directlyAffected: string[];
  allAffected: string[];
  affectedFiles: string[];
}

export interface ProjectDetectionContext {
  projectRoot: string;
  files: string[];
  projects: ProjectInfo[];
}

export interface ProjectDetector {
  id: string;
  name: string;
  detectProject(
    projectRoot: string,
    files: string[]
  ): Promise<ProjectInfo | ProjectInfo[] | null> | ProjectInfo | ProjectInfo[] | null;
}
