import { Graph } from "@cascade/plugin-api";

/**
 * Detects circular dependencies in a language-agnostic graph using an iterative DFS.
 * Cycles are deduplicated by rotating them to the lexicographically smallest node.
 */
export function detectCycles(graph: Graph): string[][] {
  const fullyExplored = new Set<string>();
  const activePath = new Set<string>();
  const pathStack: string[] = [];
  const cycles: string[][] = [];

  for (const nodeId of graph.nodes.keys()) {
    if (fullyExplored.has(nodeId)) continue;

    const stack: { id: string; neighbors: string[] }[] = [
      { id: nodeId, neighbors: graph.neighborsOf(nodeId) },
    ];

    while (stack.length > 0) {
      const top = stack[stack.length - 1];

      if (!activePath.has(top.id)) {
        activePath.add(top.id);
        pathStack.push(top.id);
      }

      if (top.neighbors.length > 0) {
        const neighbor = top.neighbors.pop()!;
        if (activePath.has(neighbor)) {
          // Cycle found: extract segment
          const cycle = pathStack.slice(pathStack.indexOf(neighbor));
          cycle.push(neighbor);
          addUniqueCycle(cycles, cycle);
        } else if (!fullyExplored.has(neighbor)) {
          stack.push({ id: neighbor, neighbors: graph.neighborsOf(neighbor) });
        }
      } else {
        fullyExplored.add(top.id);
        activePath.delete(top.id);
        pathStack.pop();
        stack.pop();
      }
    }
  }
  return cycles;
}

function addUniqueCycle(cycles: string[][], cycle: string[]): void {
  const minIdx = cycle.slice(0, -1).reduce((min, cur, i, arr) => (cur < arr[min] ? i : min), 0);
  const canonical = [...cycle.slice(minIdx, -1), ...cycle.slice(0, minIdx), cycle[minIdx]];
  const key = canonical.join("->");
  if (!cycles.some((c) => c.join("->") === key)) {
    cycles.push(canonical);
  }
}
