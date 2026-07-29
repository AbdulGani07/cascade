import { Graph } from "@cascade-code/plugin-api";

/**
 * Performs a BFS to find all nodes reachable from the starting set.
 */
export function reachableFrom(graph: Graph, starts: string[]): Set<string> {
  const visited = new Set<string>(starts);
  const queue = [...starts];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    for (const neighbor of graph.neighborsOf(current)) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return visited;
}

/**
 * Performs a BFS to find all nodes that import the starting set (reverse traversal).
 */
export function reverseReachableFrom(graph: Graph, starts: string[]): Set<string> {
  const visited = new Set<string>(starts);
  const queue = [...starts];
  let head = 0;

  while (head < queue.length) {
    const current = queue[head++];
    for (const parent of graph.incomingTo(current)) {
      if (!visited.has(parent)) {
        visited.add(parent);
        queue.push(parent);
      }
    }
  }
  return visited;
}
