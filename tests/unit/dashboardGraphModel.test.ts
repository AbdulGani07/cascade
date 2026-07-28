import { describe, expect, it } from "vitest";
import {
  boundedHighConnectivityNodes,
  shortestDependencyPath,
  stronglyConnectedComponents,
} from "../../packages/dashboard/src/lib/graphModel";

describe("dashboard graph model", () => {
  it("finds direct and transitive evidence paths", () => {
    const edges = [
      { from: "app", to: "api" },
      { from: "api", to: "domain" },
    ];
    expect(shortestDependencyPath(edges, "app", "domain")).toEqual(["app", "api", "domain"]);
    expect(shortestDependencyPath(edges, "domain", "app")).toEqual([]);
  });

  it("groups strongly connected components deterministically", () => {
    const components = stronglyConnectedComponents(
      ["a", "b", "c"],
      [
        { from: "a", to: "b" },
        { from: "b", to: "a" },
        { from: "b", to: "c" },
      ]
    );
    expect(components).toEqual([["a", "b"], ["c"]]);
  });

  it("bounds a 50,000-node graph without quadratic work", () => {
    const nodes = Array.from(
      { length: 50_000 },
      (_, index) => `node-${index.toString().padStart(5, "0")}`
    );
    const edges = Array.from({ length: 100_000 }, (_, index) => ({
      from: nodes[index % nodes.length],
      to: nodes[(index * 17 + 1) % nodes.length],
    }));
    const started = performance.now();
    const visible = boundedHighConnectivityNodes(nodes, edges, 400);
    const elapsed = performance.now() - started;
    expect(visible).toHaveLength(400);
    expect(elapsed).toBeLessThan(1_500);
  });
});
