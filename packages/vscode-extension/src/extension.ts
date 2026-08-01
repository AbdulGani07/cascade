import { spawn, type ChildProcess } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import * as vscode from "vscode";
import type {
  EditorDiagnostic,
  ServiceLimits,
  WorkspaceHealth,
} from "@cascade-code/editor-service";
import { ProcessServiceClient } from "./client.js";
import { CascadeEditorController, type EditorHost, type EditorWorkspace } from "./controller.js";

let controller: CascadeEditorController | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const configuration = vscode.workspace.getConfiguration("cascade");
  const limits: Partial<ServiceLimits> = {
    maxFiles: configuration.get("maxFiles", 100_000),
    maxEdges: configuration.get("maxEdges", 300_000),
    maxTraversalDepth: configuration.get("maxTraversalDepth", 30),
    debounceMs: configuration.get("debounceMs", 750),
  };
  const configuredService = vscode.workspace.isTrusted
    ? configuration.get<string>("servicePath", "")
    : "";
  const client = new ProcessServiceClient(limits, configuredService);
  const diagnostics = vscode.languages.createDiagnosticCollection("cascade");
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 80);
  status.command = "cascade.refreshWorkspace";
  status.text = "$(pulse) Cascade: idle";
  status.tooltip = "Cascade local analysis health";
  status.show();
  const dashboardProcesses = new Set<ChildProcess>();
  const diagnosticsByWorkspace = new Map<string, EditorDiagnostic[]>();

  const host: EditorHost = {
    registerCommand(command, handler) {
      return vscode.commands.registerCommand(command, async (...args: unknown[]) => {
        try {
          return await handler(...args);
        } catch (error) {
          await vscode.window.showErrorMessage(`Cascade: ${(error as Error).message}`);
          return undefined;
        }
      });
    },
    activeFile() {
      return vscode.window.activeTextEditor?.document.uri.fsPath;
    },
    workspaceForFile(file) {
      const folder = vscode.workspace.getWorkspaceFolder(vscode.Uri.file(file));
      return folder ? toWorkspace(folder) : undefined;
    },
    workspaces() {
      return [...(vscode.workspace.workspaceFolders ?? [])].map(toWorkspace);
    },
    async showItems(title, items) {
      if (!items.length) {
        await vscode.window.showInformationMessage(`${title}: none found.`);
        return;
      }
      await vscode.window.showQuickPick(items, { title, matchOnDescription: true });
    },
    showMessage(message, kind = "info") {
      if (kind === "error") void vscode.window.showErrorMessage(message);
      else if (kind === "warning") void vscode.window.showWarningMessage(message);
      else void vscode.window.setStatusBarMessage(message, 4000);
    },
    requestPath(prompt) {
      return Promise.resolve(vscode.window.showInputBox({ prompt, placeHolder: "src/example.ts" }));
    },
    publishDiagnostics(workspace, values) {
      diagnosticsByWorkspace.set(workspace.id, values);
      diagnostics.clear();
      for (const [workspaceId, workspaceDiagnostics] of diagnosticsByWorkspace) {
        const descriptor = host.workspaces().find((item) => item.id === workspaceId);
        if (!descriptor) continue;
        const byFile = new Map<string, vscode.Diagnostic[]>();
        for (const item of workspaceDiagnostics) {
          const target = path.resolve(descriptor.root, item.file);
          const fileDiagnostics = byFile.get(target) ?? [];
          const range = item.location
            ? new vscode.Range(
                Math.max(0, item.location.startLine - 1),
                Math.max(0, item.location.startColumn - 1),
                Math.max(0, item.location.endLine - 1),
                Math.max(0, item.location.endColumn - 1)
              )
            : new vscode.Range(0, 0, 0, 1);
          const severity =
            item.severity === "error"
              ? vscode.DiagnosticSeverity.Error
              : item.severity === "info"
                ? vscode.DiagnosticSeverity.Information
                : vscode.DiagnosticSeverity.Warning;
          const diagnostic = new vscode.Diagnostic(range, item.message, severity);
          diagnostic.source = "Cascade";
          diagnostic.code = item.code;
          fileDiagnostics.push(diagnostic);
          byFile.set(target, fileDiagnostics);
        }
        for (const [file, fileDiagnostics] of byFile)
          diagnostics.set(vscode.Uri.file(file), fileDiagnostics);
      }
    },
    updateHealth(health) {
      renderHealth(status, health);
    },
    async openDashboard(workspace) {
      const require = createRequire(import.meta.url);
      const configuredCli = vscode.workspace.isTrusted
        ? vscode.workspace.getConfiguration("cascade").get<string>("cliPath", "")
        : "";
      let command = configuredCli || "cascade";
      let args = ["dashboard", workspace.root];
      if (!configuredCli) {
        try {
          command = process.execPath;
          args = [require.resolve("@cascade-code/cli"), "dashboard", workspace.root];
        } catch {
          // Use the globally installed cascade command.
        }
      }
      const child = spawn(command, args, {
        cwd: workspace.root,
        detached: false,
        windowsHide: true,
        stdio: "ignore",
      });
      dashboardProcesses.add(child);
      child.once("exit", () => dashboardProcesses.delete(child));
      child.once("error", (error) =>
        vscode.window.showErrorMessage(
          `Cannot start Cascade dashboard: ${error.message}. Install @cascade-code/cli or configure cascade.cliPath.`
        )
      );
      child.unref();
      await vscode.window.showInformationMessage(
        "Cascade dashboard is starting locally. No source code leaves this machine."
      );
    },
    backgroundAnalysisEnabled() {
      return vscode.workspace.getConfiguration("cascade").get("backgroundAnalysis", false);
    },
  };

  controller = new CascadeEditorController(client, host);
  await controller.activate();

  const saveSubscription = vscode.workspace.onDidSaveTextDocument(
    (document: { uri: { fsPath: string }; version: number }) =>
      void controller?.savedFile(document.uri.fsPath, document.version)
  );
  const folderSubscription = vscode.workspace.onDidChangeWorkspaceFolders(
    (event: vscode.WorkspaceFoldersChangeEvent) => {
      for (const folder of event.added)
        void controller
          ?.addWorkspace(toWorkspace(folder))
          .catch((error: Error) => vscode.window.showErrorMessage(`Cascade: ${error.message}`));
      for (const folder of event.removed)
        void controller
          ?.removeWorkspace(toWorkspace(folder).id)
          .catch((error: Error) => vscode.window.showErrorMessage(`Cascade: ${error.message}`));
    }
  );
  const codeLensProvider = vscode.languages.registerCodeLensProvider(
    { scheme: "file" },
    {
      async provideCodeLenses(document: { uri: { fsPath: string } }) {
        if (!vscode.workspace.getConfiguration("cascade").get("codeLens", true)) return [];
        try {
          const counts = await controller!.codeLens(document.uri.fsPath);
          const range = new vscode.Range(0, 0, 0, 0);
          return [
            new vscode.CodeLens(range, {
              title: `${counts.dependencies} dependencies · ${counts.dependents} dependents`,
              command: "cascade.showDependents",
            }),
            new vscode.CodeLens(range, {
              title: `${counts.impact} transitively affected`,
              command: "cascade.analyzeCurrentFile",
            }),
          ];
        } catch {
          return [
            new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
              title: "Analyze with Cascade",
              command: "cascade.analyzeCurrentFile",
            }),
          ];
        }
      },
    }
  );
  context.subscriptions.push(
    diagnostics,
    status,
    saveSubscription,
    folderSubscription,
    codeLensProvider,
    {
      dispose() {
        controller?.dispose();
        controller = undefined;
        for (const child of dashboardProcesses) child.kill();
      },
    }
  );
}

export function deactivate(): void {
  controller?.dispose();
  controller = undefined;
}

function toWorkspace(folder: vscode.WorkspaceFolder): EditorWorkspace {
  const value = folder;
  return {
    id: value.uri.fsPath.replace(/\\/g, "/"),
    root: value.uri.fsPath,
    name: value.name,
  };
}

function renderHealth(status: vscode.StatusBarItem, health: WorkspaceHealth[]): void {
  if (!health.length) {
    status.text = "$(circle-slash) Cascade: no workspace";
    status.tooltip = "Open a folder to use Cascade.";
    return;
  }
  if (health.some((item) => item.status === "error" || item.status === "limited")) {
    status.text = "$(warning) Cascade: attention";
    status.backgroundColor = new vscode.ThemeColor("statusBarItem.warningBackground");
  } else if (health.some((item) => item.status === "analyzing")) {
    status.text = "$(sync~spin) Cascade: analyzing";
    status.backgroundColor = undefined;
  } else if (health.every((item) => item.status === "ready")) {
    status.text = `$(check) Cascade: ${health.reduce((sum, item) => sum + item.files, 0)} files`;
    status.backgroundColor = undefined;
  } else {
    status.text = "$(pulse) Cascade: idle";
    status.backgroundColor = undefined;
  }
  status.tooltip = health
    .map((item) => `${item.id}: ${item.status} (${item.files} files, ${item.edges} edges)`)
    .join("\n");
}
