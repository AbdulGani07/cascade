import path from "node:path";
import type {
  AffectedTest,
  DependencyLookup,
  EditorDiagnostic,
  ImpactLookup,
  WorkspaceDescriptor,
  WorkspaceHealth,
} from "@cascade/editor-service";
import type { ServiceClient } from "./client.js";

export const CASCADE_COMMANDS = [
  "cascade.analyzeCurrentFile",
  "cascade.showDependents",
  "cascade.showDependencyPath",
  "cascade.showAffectedTests",
  "cascade.openDashboard",
  "cascade.refreshWorkspace",
] as const;

export interface EditorWorkspace extends WorkspaceDescriptor {}
export interface EditorHost {
  registerCommand(command: string, handler: (...args: unknown[]) => unknown): { dispose(): void };
  activeFile(): string | undefined;
  workspaceForFile(file: string): EditorWorkspace | undefined;
  workspaces(): EditorWorkspace[];
  showItems(title: string, items: Array<{ label: string; description?: string }>): Promise<void>;
  showMessage(message: string, kind?: "info" | "warning" | "error"): void;
  requestPath(prompt: string): Promise<string | undefined>;
  publishDiagnostics(workspace: EditorWorkspace, diagnostics: EditorDiagnostic[]): void;
  updateHealth(health: WorkspaceHealth[]): void;
  openDashboard(workspace: EditorWorkspace): Promise<void>;
  backgroundAnalysisEnabled(): boolean;
}

export class CascadeEditorController {
  private readonly disposables: Array<{ dispose(): void }> = [];

  constructor(
    private readonly client: ServiceClient,
    private readonly host: EditorHost
  ) {}

  async activate(): Promise<void> {
    for (const workspace of this.host.workspaces())
      await this.client.request("workspace/add", { workspace });
    this.register("cascade.analyzeCurrentFile", () => this.analyzeCurrentFile());
    this.register("cascade.showDependents", () => this.showDependents());
    this.register("cascade.showDependencyPath", () => this.showDependencyPath());
    this.register("cascade.showAffectedTests", () => this.showAffectedTests());
    this.register("cascade.openDashboard", () => this.openDashboard());
    this.register("cascade.refreshWorkspace", () => this.refreshAll());
    await this.updateHealth();
    if (this.host.backgroundAnalysisEnabled()) await this.refreshAll();
  }

  async addWorkspace(workspace: EditorWorkspace): Promise<void> {
    await this.client.request("workspace/add", { workspace });
    if (this.host.backgroundAnalysisEnabled()) await this.refresh(workspace);
  }

  async removeWorkspace(workspaceId: string): Promise<void> {
    await this.client.request("workspace/remove", { workspaceId });
    await this.updateHealth();
  }

  async savedFile(file: string, version?: number): Promise<void> {
    if (!this.host.backgroundAnalysisEnabled()) return;
    const workspace = this.host.workspaceForFile(file);
    if (!workspace) return;
    await this.client.request("workspace/updateFile", {
      update: { workspaceId: workspace.id, file, version, kind: "changed", saved: true },
    });
    await this.updateHealth();
  }

  async codeLens(
    file: string
  ): Promise<{ dependencies: number; dependents: number; impact: number }> {
    const workspace = this.requireWorkspace(file);
    const [dependencies, dependents, impact] = await Promise.all([
      this.client.request<DependencyLookup>("query/dependencies", {
        workspaceId: workspace.id,
        file,
        options: { transitive: false },
      }),
      this.client.request<DependencyLookup>("query/dependents", {
        workspaceId: workspace.id,
        file,
        options: { transitive: false },
      }),
      this.client.request<ImpactLookup>("query/impact", { workspaceId: workspace.id, file }),
    ]);
    return {
      dependencies: dependencies.direct.length,
      dependents: dependents.direct.length,
      impact: impact.transitiveDependents.length,
    };
  }

  dispose(): void {
    for (const disposable of this.disposables) disposable.dispose();
    this.client.dispose();
  }

  private register(command: (typeof CASCADE_COMMANDS)[number], handler: () => unknown): void {
    this.disposables.push(this.host.registerCommand(command, handler));
  }

  private async analyzeCurrentFile(): Promise<void> {
    const { file, workspace } = this.current();
    await this.refresh(workspace);
    const [impact, diagnostics] = await Promise.all([
      this.client.request<ImpactLookup>("query/impact", { workspaceId: workspace.id, file }),
      this.client.request<EditorDiagnostic[]>("query/diagnostics", {
        workspaceId: workspace.id,
        file,
      }),
    ]);
    this.host.publishDiagnostics(workspace, diagnostics);
    this.host.showMessage(
      `${path.basename(file)}: ${impact.directDependents.length} direct and ${impact.transitiveDependents.length} total dependents.`
    );
  }

  private async showDependents(): Promise<void> {
    const { file, workspace } = this.current();
    const lookup = await this.client.request<DependencyLookup>("query/dependents", {
      workspaceId: workspace.id,
      file,
    });
    await this.host.showItems(
      `Dependents of ${path.basename(file)}`,
      lookup.transitive.map((item) => ({
        label: item,
        description: lookup.direct.includes(item) ? "direct" : "transitive",
      }))
    );
  }

  private async showDependencyPath(): Promise<void> {
    const { file, workspace } = this.current();
    const target = await this.host.requestPath("Target workspace-relative file");
    if (!target) return;
    const result = await this.client.request<{
      found: boolean;
      nodes: string[];
      truncated: boolean;
    }>("query/explanationPath", {
      workspaceId: workspace.id,
      from: file,
      to: target,
      direction: "dependency",
    });
    await this.host.showItems(
      result.found ? "Dependency path" : "No dependency path found",
      result.nodes.map((item, index) => ({ label: item, description: `step ${index + 1}` }))
    );
  }

  private async showAffectedTests(): Promise<void> {
    const { file, workspace } = this.current();
    const tests = await this.client.request<AffectedTest[]>("query/affectedTests", {
      workspaceId: workspace.id,
      file,
    });
    await this.host.showItems(
      `Affected-test candidates for ${path.basename(file)}`,
      tests.map((test) => ({ label: test.file, description: `${test.confidence} confidence` }))
    );
  }

  private async openDashboard(): Promise<void> {
    const file = this.host.activeFile();
    const workspace = file
      ? this.host.workspaceForFile(file)
      : this.host.workspaces().sort((left, right) => left.id.localeCompare(right.id))[0];
    if (!workspace) throw new Error("Open a workspace before starting Cascade.");
    await this.host.openDashboard(workspace);
  }

  private async refreshAll(): Promise<void> {
    for (const workspace of this.host.workspaces()) await this.refresh(workspace);
  }

  private async refresh(workspace: EditorWorkspace): Promise<void> {
    this.host.showMessage(`Cascade is analyzing ${workspace.name ?? workspace.id} locally.`);
    try {
      await this.client.request("workspace/refresh", { workspaceId: workspace.id });
      const diagnostics = await this.client.request<EditorDiagnostic[]>("query/diagnostics", {
        workspaceId: workspace.id,
      });
      this.host.publishDiagnostics(workspace, diagnostics);
    } catch (error) {
      this.host.showMessage((error as Error).message, "error");
      throw error;
    } finally {
      await this.updateHealth();
    }
  }

  private async updateHealth(): Promise<void> {
    this.host.updateHealth(await this.client.request<WorkspaceHealth[]>("health"));
  }

  private current(): { file: string; workspace: EditorWorkspace } {
    const file = this.host.activeFile();
    if (!file) throw new Error("Open a file to use this Cascade command.");
    return { file, workspace: this.requireWorkspace(file) };
  }

  private requireWorkspace(file: string): EditorWorkspace {
    const workspace = this.host.workspaceForFile(file);
    if (!workspace) throw new Error(`'${file}' does not belong to an open workspace.`);
    return workspace;
  }
}
