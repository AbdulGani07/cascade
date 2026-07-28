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
}

export interface ProjectDetector {
  id: string;
  name: string;
  detectProject(
    projectRoot: string,
    files: string[]
  ): Promise<ProjectInfo | null> | ProjectInfo | null;
}
