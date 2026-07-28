import { describe, it, expect } from "vitest";
import { detectCycles } from "../../packages/core/src/graph/cycleDetector.js";
import { findDeadFiles } from "../../packages/core/src/analysis/deadCodeAnalyzer.js";
import { simulateDeletion } from "../../packages/core/src/analysis/impactSimulator.js";
import { Graph, DependencyNode } from "../../packages/core/src/types/index.js";

describe("Graph algorithms & analysis", () => {
  const nodesMap = new Map<string, DependencyNode>([
    ["a.ts", { id: "a.ts", relativePath: "a.ts", isEntryPoint: true, language: "typescript" }],
    ["b.ts", { id: "b.ts", relativePath: "b.ts", isEntryPoint: false, language: "typescript" }],
    ["c.ts", { id: "c.ts", relativePath: "c.ts", isEntryPoint: false, language: "typescript" }],
    [
      "dead.ts",
      { id: "dead.ts", relativePath: "dead.ts", isEntryPoint: false, language: "typescript" },
    ],
  ]);

  const edges = [
    { from: "a.ts", to: "b.ts", kind: "static" as const },
    { from: "b.ts", to: "c.ts", kind: "static" as const },
    { from: "c.ts", to: "b.ts", kind: "static" as const }, // Cycle between b and c
  ];

  const graph: Graph = {
    nodes: nodesMap,
    edges,
    neighborsOf: (id) => edges.filter((e) => e.from === id).map((e) => e.to),
    incomingTo: (id) => edges.filter((e) => e.to === id).map((e) => e.from),
  };

  it("detects circular dependency loops correctly", () => {
    const cycles = detectCycles(graph);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0]).toEqual(expect.arrayContaining(["b.ts", "c.ts"]));
  });

  it("identifies unreferenced / unreachable dead code files", () => {
    const dead = findDeadFiles(graph, ["a.ts"]);
    expect(dead).toContain("dead.ts");
    expect(dead).not.toContain("a.ts");
    expect(dead).not.toContain("b.ts");
  });

  it("simulates deletion impact and blast radius", () => {
    const impact = simulateDeletion(graph, "c.ts");
    expect(impact.isSafeToDelete).toBe(false);
    expect(impact.allAffected).toContain("b.ts");
    expect(impact.allAffected).toContain("a.ts");
  });
});
