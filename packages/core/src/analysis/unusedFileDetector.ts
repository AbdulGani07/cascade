import { Graph, DependencyNode } from "@cascade-code/plugin-api";
import { findDeadFiles } from "./deadCodeAnalyzer.js";

/**
 * Wraps dead code detection to filter out noise,
 * such as type-only definition files (.d.ts) which are unreferenced by design.
 */
export function findUnusedFiles(
  graph: Graph,
  entryPoints: string[],
  nodes: DependencyNode[]
): string[] {
  const deadFiles = findDeadFiles(graph, entryPoints);

  return deadFiles.filter((id: string) => {
    const node = nodes.find((n: DependencyNode) => n.id === id);
    return node && !node.relativePath.endsWith(".d.ts");
  });
}
