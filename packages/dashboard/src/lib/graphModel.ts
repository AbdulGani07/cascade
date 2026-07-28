export type ModelEdge = { from: string; to: string };

export function shortestDependencyPath(edges: ModelEdge[], from: string, to: string): string[] {
  if (from === to) return [from];
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  const queue = [from];
  const previous = new Map<string, string | null>([[from, null]]);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    for (const next of outgoing.get(current) ?? [])
      if (!previous.has(next)) {
        previous.set(next, current);
        if (next === to) {
          const path = [to];
          let item: string | null = current;
          while (item) {
            path.push(item);
            item = previous.get(item) ?? null;
          }
          return path.reverse();
        }
        queue.push(next);
      }
  }
  return [];
}

export function stronglyConnectedComponents(nodeIds: string[], edges: ModelEdge[]): string[][] {
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) outgoing.set(edge.from, [...(outgoing.get(edge.from) ?? []), edge.to]);
  let index = 0;
  const indices = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const stacked = new Set<string>();
  const result: string[][] = [];
  const visit = (node: string) => {
    indices.set(node, index);
    low.set(node, index);
    index += 1;
    stack.push(node);
    stacked.add(node);
    for (const next of outgoing.get(node) ?? []) {
      if (!indices.has(next)) {
        visit(next);
        low.set(node, Math.min(low.get(node)!, low.get(next)!));
      } else if (stacked.has(next)) low.set(node, Math.min(low.get(node)!, indices.get(next)!));
    }
    if (low.get(node) === indices.get(node)) {
      const component: string[] = [];
      let current: string;
      do {
        current = stack.pop()!;
        stacked.delete(current);
        component.push(current);
      } while (current !== node);
      result.push(component.sort());
    }
  };
  for (const node of nodeIds) if (!indices.has(node)) visit(node);
  return result.sort((a, b) => a[0].localeCompare(b[0]));
}

export function boundedHighConnectivityNodes(
  nodeIds: string[],
  edges: ModelEdge[],
  limit: number
): string[] {
  const degree = new Map<string, number>();
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  }
  return [...nodeIds]
    .sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || a.localeCompare(b))
    .slice(0, limit);
}
