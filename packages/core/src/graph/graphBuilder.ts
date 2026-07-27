import { Graph, DependencyNode, DependencyEdge, Warning } from "../types/index.js";
import { parseImports } from "../parser/astParser.js";
import { resolveSpecifier } from "./dependencyGraph.js";

/**
 * Assembles the Graph object by parsing files and resolving their imports.
 */
export function buildGraph(nodes: DependencyNode[]): { graph: Graph; warnings: Warning[] } {
  const nodesMap = new Map<string, DependencyNode>(nodes.map((n) => [n.id, n]));
  const edges: DependencyEdge[] = [];
  const warnings: Warning[] = [];

  for (const node of nodes) {
    const { specifiers, warning } = parseImports(node);
    if (warning) warnings.push(warning);

    for (const raw of specifiers) {
      const resolved = resolveSpecifier(node.id, raw.specifier, nodesMap);
      if (resolved) {
        edges.push({ from: node.id, to: resolved, kind: raw.kind });
      }
    }
  }

  const graph: Graph = {
    nodes: nodesMap,
    edges,
    // Note: Callers performing high-frequency lookups should precompute these maps
    neighborsOf: (id: string) => edges.filter((e) => e.from === id).map((e) => e.to),
    incomingTo: (id: string) => edges.filter((e) => e.to === id).map((e) => e.from),
  };

  return { graph, warnings };
}