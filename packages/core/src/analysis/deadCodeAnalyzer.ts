import { Graph } from "../types/index.js";
import { reachableFrom } from "../graph/graphAlgorithms.js";

/**
 * Identifies files that are not reachable from any entry point.
 * Special case: returns empty if no entry points exist to avoid flagging everything as dead.
 */
export function findDeadFiles(graph: Graph, entryPoints: string[]): string[] {
  if (entryPoints.length === 0) return [];

  const reachable = reachableFrom(graph, entryPoints);
  const dead: string[] = [];

  for (const nodeId of graph.nodes.keys()) {
    if (!reachable.has(nodeId)) {
      dead.push(nodeId);
    }
  }

  return dead;
}