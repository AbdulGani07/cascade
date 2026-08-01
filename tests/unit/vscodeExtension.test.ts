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
  disposed = false;
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
  dispose(): void {
    this.disposed = true;
  }
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

  it("keeps saved-file analysis opt-in and handles portable workspace paths", async () => {
    const workspace = {
      id: "portable",
      root: path.resolve("workspace (β)", "project space"),
      name: "portable",
    };
    const client = new FakeClient();
    const { host } = createHost([workspace]);
    const controller = new CascadeEditorController(client, host);
    await controller.activate();
    await controller.savedFile(path.join(workspace.root, "src", "main.ts"), 2);
    expect(client.requests.some((request) => request.method === "workspace/updateFile")).toBe(
      false
    );

    host.backgroundAnalysisEnabled = () => true;
    await controller.savedFile(path.join(workspace.root, "src", "main.ts"), 3);
    expect(client.requests.some((request) => request.method === "workspace/updateFile")).toBe(true);
    controller.dispose();
    expect(client.disposed).toBe(true);
  });

  it("keeps manifest activation, commands, privacy defaults, and entry point aligned", () => {
    const manifest = JSON.parse(
      fs.readFileSync(path.resolve("packages/vscode-extension/package.json"), "utf8")
    );
    expect(manifest.main).toBe("./dist/extension.js");
    expect(manifest.publisher).toBe("cascade-code");
    expect(manifest.name).toBe("cascade-code-intelligence");
    expect(manifest.private).toBe(true);
    expect(manifest.version).toBe("3.3.1");
    expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(manifest.icon).toBe("media/icon.png");
    expect(fs.existsSync(path.resolve("packages/vscode-extension/media/icon.png"))).toBe(true);
    expect(fs.existsSync(path.resolve("packages/vscode-extension/media/icon.svg"))).toBe(true);
    expect(
      fs
        .readFileSync(path.resolve("packages/vscode-extension/.vscodeignore"), "utf8")
        .split(/\r?\n/)
    ).toContain("media/*.svg");
    expect(fs.existsSync(path.resolve("docs/VSCODE_MARKETPLACE_SCREENSHOTS.md"))).toBe(true);
    expect(fs.existsSync(path.resolve("scripts/prepare-vscode-marketplace-screenshots.ps1"))).toBe(
      true
    );
    expect(fs.existsSync(path.resolve("examples/vscode-extension-demo/cascade.config.json"))).toBe(
      true
    );
    expect(manifest.dependencies["@cascade-code/editor-service"]).toBe("workspace:^");
    expect(manifest.dependencies["@cascade-code/cli"]).toBe("workspace:^");
    expect(manifest.scripts["package:prerelease"]).toContain("--pre-release");
    expect(
      manifest.contributes.configuration.properties["cascade.backgroundAnalysis"].default
    ).toBe(false);
    expect(manifest.capabilities.untrustedWorkspaces).toEqual({
      supported: true,
      restrictedConfigurations: ["cascade.servicePath", "cascade.cliPath"],
    });
    expect(
      manifest.contributes.commands.map((item: { command: string }) => item.command).sort()
    ).toEqual([...CASCADE_COMMANDS].sort());
    const extensionSource = fs.readFileSync(
      path.resolve("packages/vscode-extension/src/extension.ts"),
      "utf8"
    );
    expect(extensionSource).not.toContain("telemetry");
    expect(extensionSource.match(/vscode\.workspace\.isTrusted/g)).toHaveLength(2);
    const packagingSource = fs.readFileSync(
      path.resolve("packages/vscode-extension/scripts/package.mjs"),
      "utf8"
    );
    expect(packagingSource).toContain('packageManifest.name === "npm-check-updates"');
    expect(packagingSource).toContain("VSIX must exclude the transitive npm-check-updates");
  });
});
