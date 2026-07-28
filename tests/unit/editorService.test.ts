import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { AnalysisResult, DependencyEdge, DependencyNode } from "@cascade/plugin-api";
import {
  CancellationTokenSource,
  ServiceError,
  WorkspaceAnalysisService,
} from "@cascade/editor-service";

const root = path.resolve("tests/fixtures/editor-service");

function node(id: string, options: Partial<DependencyNode> = {}): DependencyNode {
  return {
    id,
    absolutePath: path.join(root, id),
    relativePath: id,
    language: "typescript",
    fileCategory: id.includes(".test.") ? "test" : "source",
    isEntryPoint: id === "src/main.ts",
    isTestFile: id.includes(".test."),
    isGeneratedFile: false,
    parseStatus: "success",
    pluginProvenance: { pluginId: "test", pluginVersion: "1" },
    ...options,
  };
}

function edge(from: string, to: string, confidence = 1): DependencyEdge {
  return {
    id: `${from}->${to}`,
    from,
    to,
    edgeType: "import",
    importKind: "static",
    isStatic: true,
    isDynamic: false,
    isTypeOnly: false,
    isReExport: false,
    isConditional: false,
    resolutionStatus: "resolved",
    resolverProvenance: { resolverId: "test", pluginId: "test" },
    confidence,
  };
}

function fixture(): AnalysisResult {
  const nodes = [
    node("src/core.ts", { project: "core" }),
    node("src/service.ts", { project: "app" }),
    node("src/main.ts", { project: "app" }),
    node("test/service.test.ts", { project: "app" }),
  ];
  const edges = [
    edge("src/service.ts", "src/core.ts"),
    edge("src/main.ts", "src/service.ts"),
    edge("test/service.test.ts", "src/service.ts", 0.8),
    {
      ...edge("src/core.ts", "missing.ts", 0.5),
      resolutionStatus: "unresolved" as const,
      extractedText: "./missing",
      dependencyCategory: "unresolved" as const,
    },
  ];
  return {
    version: "2.0",
    generatedAt: "2026-07-28T00:00:00.000Z",
    projectRoot: root,
    nodes,
    edges,
    cycles: [["src/core.ts", "src/service.ts"]],
    deadFiles: [],
    entryPoints: ["src/main.ts"],
    entryPointEvidence: [
      { file: "src/main.ts", confidence: 1, reason: "configured", kind: "configured" },
    ],
    impact: {
      "src/core.ts": {
        target: "src/core.ts",
        directlyAffected: ["src/service.ts"],
        allAffected: ["src/service.ts", "src/main.ts", "test/service.test.ts"],
        isSafeToDelete: false,
      },
    },
    warnings: [],
    diagnostics: [],
    governance: {
      schemaVersion: "1.0",
      violations: [
        {
          id: "boundary",
          ruleId: "no-core-to-missing",
          severity: "error",
          from: "src/core.ts",
          to: "missing.ts",
          dependencyPath: ["src/core.ts", "missing.ts"],
          message: "Core cannot import missing.",
          baseline: false,
          suppressed: false,
          evidence: ["test"],
        },
      ],
      diagnostics: [],
      unusedRules: [],
      contradictoryRules: [],
      boundaries: [],
    },
  };
}

describe("WorkspaceAnalysisService", () => {
  it("serves deterministic dependency, impact, diagnostic, test, and explanation queries", async () => {
    const service = new WorkspaceAnalysisService({}, () => fixture());
    service.addWorkspace({ id: "root", root });
    const health = await service.refresh("root");
    expect(health.status).toBe("ready");
    expect(service.dependencies("root", "src/main.ts").direct).toEqual(["src/service.ts"]);
    expect(service.dependents("root", "src/core.ts").transitive).toEqual([
      "src/main.ts",
      "src/service.ts",
      "test/service.test.ts",
    ]);
    expect(service.impact("root", "src/core.ts").entryPoints).toEqual(["src/main.ts"]);
    expect(service.diagnostics("root", "src/core.ts").map((item) => item.kind)).toEqual([
      "architecture",
      "cycle",
      "unresolved",
    ]);
    expect(service.affectedTests("root", "src/core.ts")[0]).toMatchObject({
      file: "test/service.test.ts",
      confidence: "medium",
    });
    expect(service.explanationPath("root", "src/main.ts", "src/core.ts").nodes).toEqual([
      "src/main.ts",
      "src/service.ts",
      "src/core.ts",
    ]);
  });

  it("isolates multi-root state and ignores unsaved or stale updates", async () => {
    const analyzer = vi.fn(() => fixture());
    const service = new WorkspaceAnalysisService({ debounceMs: 25 }, analyzer);
    service.addWorkspace({ id: "a", root });
    service.addWorkspace({ id: "b", root: path.resolve("tests/fixtures/python") });
    await service.refresh("a");
    expect(
      service.updateFile({
        workspaceId: "a",
        file: "src/core.ts",
        version: 2,
        kind: "changed",
        saved: false,
      }).scheduled
    ).toBe(false);
    expect(
      service.updateFile({
        workspaceId: "a",
        file: "src/core.ts",
        version: 2,
        kind: "changed",
        saved: true,
      }).scheduled
    ).toBe(true);
    expect(
      service.updateFile({
        workspaceId: "a",
        file: "src/core.ts",
        version: 1,
        kind: "changed",
        saved: true,
      }).scheduled
    ).toBe(false);
    expect(service.listHealth().map((item) => item.id)).toEqual(["a", "b"]);
    service.dispose();
  });

  it("enforces resource limits and cancellation boundaries", async () => {
    const limited = new WorkspaceAnalysisService({ maxFiles: 1 }, () => fixture());
    limited.addWorkspace({ id: "root", root });
    await expect(limited.refresh("root")).rejects.toMatchObject({ code: "RESOURCE_LIMIT" });
    expect(limited.listHealth()[0].status).toBe("limited");

    const cancelled = new WorkspaceAnalysisService({}, () => fixture());
    cancelled.addWorkspace({ id: "root", root });
    const cancellation = new CancellationTokenSource();
    cancellation.cancel();
    await expect(cancelled.refresh("root", cancellation.token)).rejects.toBeInstanceOf(
      ServiceError
    );
  });
});
