import { Graph } from "@cascade/plugin-api";
import { reachableFrom } from "../graph/graphAlgorithms.js";

/**
 * Identifies files that are not reachable from any entry point.
 */
export function findDeadFiles(graph: Graph, entryPoints: string[]): string[] {
  if (entryPoints.length === 0) return [];

  const reachable = reachableFrom(graph, entryPoints);
  const dead: string[] = [];

  for (const [nodeId, node] of graph.nodes.entries()) {
    // Ignore test files and config files when checking dead code
    if (node.isTestFile || node.fileCategory === "config" || node.fileCategory === "test") {
      continue;
    }
    if (!reachable.has(nodeId)) {
      dead.push(nodeId);
    }
  }

  return dead;
}
