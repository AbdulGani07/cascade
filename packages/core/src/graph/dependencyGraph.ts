import path from "node:path";
import { DependencyNode } from "@cascade-code/plugin-api";

/**
 * Legacy specifier resolver retained for backwards compatibility.
 */
export function resolveSpecifier(
  fromFile: string,
  specifier: string,
  allNodes: Map<string, DependencyNode>
): string | null {
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return null;
  }

  const fromDir = path.dirname(fromFile);
  const resolvedBase = path.resolve(fromDir, specifier);
  const extensions = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

  const candidates = [
    resolvedBase,
    ...extensions.map((ext) => resolvedBase + ext),
    ...extensions.map((ext) => path.join(resolvedBase, "index" + ext)),
  ];

  for (const candidate of candidates) {
    if (allNodes.has(candidate)) {
      return candidate;
    }
  }

  return null;
}
