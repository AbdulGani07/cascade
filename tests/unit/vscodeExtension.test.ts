import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { EditorRequestMethod, WorkspaceHealth } from "@cascade-code/editor-service";
import {
  CASCADE_COMMANDS,
  CascadeEditorController,
  type EditorHost,
  type EditorWorkspace,
} from "../../packages/vscode-extension/src/controller.js";
import type { ServiceClient } from "../../packages/vscode-extension/src/client.js";

class FakeClient implements ServiceClient {
  readonly requests: Array<{ method: EditorRequestMethod; params?: Record<string, unknown> }> = [];
  request<T>(method: EditorRequestMethod, params?: Record<string, unknown>): Promise<T> {
    this.requests.push({ method, params });
    const results: Partial<Record<EditorRequestMethod, unknown>> = {
      "workspace/add": { status: "idle" },
      "workspace/remove": true,
      "workspace/refresh": { status: "ready" },
      "workspace/updateFile": { scheduled: true },
      health: [
        {
          id: "a",
          root: path.resolve("a"),
          status: "ready",
          generation: 1,
          files: 3,
          edges: 2,
        },
      ] satisfies WorkspaceHealth[],
      "query/dependencies": { direct: ["dep.ts"], transitive: ["dep.ts"], edges: [] },
      "query/dependents": {
        direct: ["direct.ts"],
        transitive: ["direct.ts", "transitive.ts"],
        edges: [],
      },
      "query/impact": {
        directDependents: ["direct.ts"],
        transitiveDependents: ["direct.ts", "transitive.ts"],
      },
      "query/diagnostics": [
        {
          kind: "cycle",
          file: "main.ts",
          severity: "warning",
          code: "CASCADE_CYCLE",
          message: "cycle",
        },
      ],
      "query/affectedTests": [{ file: "main.test.ts", confidence: "high", evidence: ["direct"] }],
      "query/explanationPath": {
        found: true,
        nodes: ["main.ts", "dep.ts"],
        truncated: false,
      },
    };
    return Promise.resolve(results[method] as T);
  }
  dispose(): void {}
}

function createHost(workspaces: EditorWorkspace[]) {
  const commands = new Map<string, () => unknown>();
  const host: EditorHost = {
    registerCommand(command, handler) {
      commands.set(command, handler);
      return { dispose: () => commands.delete(command) };
    },
    activeFile: () => path.join(workspaces[0].root, "main.ts"),
    workspaceForFile: (file) =>
      [...workspaces]
        .sort((a, b) => b.root.length - a.root.length)
        .find((workspace) => file.startsWith(workspace.root)),
    workspaces: () => workspaces,
    showItems: vi.fn(async () => undefined),
    showMessage: vi.fn(),
    requestPath: vi.fn(async () => "dep.ts"),
    publishDiagnostics: vi.fn(),
    updateHealth: vi.fn(),
    openDashboard: vi.fn(async () => undefined),
    backgroundAnalysisEnabled: () => false,
  };
  return { host, commands };
}

describe("VS Code extension controller", () => {
  it("activates every contributed command without starting opt-out background analysis", async () => {
    const roots = [
      { id: "a", root: path.resolve("a"), name: "a" },
      { id: "b", root: path.resolve("b"), name: "b" },
    ];
    const client = new FakeClient();
    const { host, commands } = createHost(roots);
    const controller = new CascadeEditorController(client, host);
    await controller.activate();
    expect([...commands.keys()].sort()).toEqual([...CASCADE_COMMANDS].sort());
    expect(client.requests.filter((request) => request.method === "workspace/add")).toHaveLength(2);
    expect(client.requests.some((request) => request.method === "workspace/refresh")).toBe(false);
  });

  it("runs commands, publishes diagnostics, and preserves multi-root routing", async () => {
    const roots = [
      { id: "a", root: path.resolve("a"), name: "a" },
      { id: "nested", root: path.resolve("a/nested"), name: "nested" },
    ];
    const client = new FakeClient();
    const { host, commands } = createHost(roots);
    const controller = new CascadeEditorController(client, host);
    await controller.activate();
    await commands.get("cascade.analyzeCurrentFile")?.();
    await commands.get("cascade.showDependents")?.();
    await commands.get("cascade.showDependencyPath")?.();
    await commands.get("cascade.showAffectedTests")?.();
    expect(host.publishDiagnostics).toHaveBeenCalled();
    expect(host.showItems).toHaveBeenCalledTimes(3);
    await controller.addWorkspace({ id: "c", root: path.resolve("c") });
    await controller.removeWorkspace("c");
    expect(client.requests.some((request) => request.method === "workspace/remove")).toBe(true);
  });

  it("keeps manifest activation, commands, privacy defaults, and entry point aligned", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.resolve("packages/vscode-extension/package.json"), "utf8")
    );
    expect(manifest.main).toBe("./dist/extension.js");
    expect(
      manifest.contributes.configuration.properties["cascade.backgroundAnalysis"].default
    ).toBe(false);
    expect(
      manifest.contributes.commands.map((item: { command: string }) => item.command).sort()
    ).toEqual([...CASCADE_COMMANDS].sort());
    expect(
      fs.readFileSync(path.resolve("packages/vscode-extension/src/extension.ts"), "utf8")
    ).not.toContain("telemetry");
  });
});
