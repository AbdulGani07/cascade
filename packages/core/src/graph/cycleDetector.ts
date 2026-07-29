import { Graph } from "@cascade-code/plugin-api";

/**
 * Finds cyclic strongly connected components in O(V + E) using iterative
 * Kosaraju passes. One deterministic representative cycle is emitted per SCC;
 * this deliberately avoids enumerating exponentially many simple cycles in a
 * dense component.
 */
export function detectCycles(graph: Graph): string[][] {
  const known = new Set(graph.nodes.keys());
  const visited = new Set<string>();
  const finishOrder: string[] = [];

  for (const start of graph.nodes.keys()) {
    if (visited.has(start)) continue;
    visited.add(start);
    const stack: Array<{ id: string; neighbors: string[]; index: number }> = [
      { id: start, neighbors: graph.neighborsOf(start).filter((id) => known.has(id)), index: 0 },
    ];
    while (stack.length) {
      const frame = stack[stack.length - 1];
      if (frame.index < frame.neighbors.length) {
        const neighbor = frame.neighbors[frame.index++];
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          stack.push({
            id: neighbor,
            neighbors: graph.neighborsOf(neighbor).filter((id) => known.has(id)),
            index: 0,
          });
        }
      } else {
        finishOrder.push(frame.id);
        stack.pop();
      }
    }
  }

  const assigned = new Set<string>();
  const cycles: string[][] = [];
  for (let index = finishOrder.length - 1; index >= 0; index--) {
    const start = finishOrder[index];
    if (assigned.has(start)) continue;
    assigned.add(start);
    const component: string[] = [];
    const stack = [start];
    while (stack.length) {
      const current = stack.pop()!;
      component.push(current);
      for (const parent of graph.incomingTo(current)) {
        if (known.has(parent) && !assigned.has(parent)) {
          assigned.add(parent);
          stack.push(parent);
        }
      }
    }
    component.sort();
    const selfLoop =
      component.length === 1 && graph.neighborsOf(component[0]).includes(component[0]);
    if (component.length > 1 || selfLoop) cycles.push([...component, component[0]]);
  }
  return cycles.sort((left, right) => left[0].localeCompare(right[0]));
}
