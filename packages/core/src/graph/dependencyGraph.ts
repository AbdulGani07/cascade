import path from "node:path";
import { DependencyNode } from "../types/index.js";

/**
 * Resolves a raw import specifier into an absolute file path.
 * Resolution order: exact path -> extensions -> index files with extensions.
 */
export function resolveSpecifier(
  fromFile: string,
  specifier: string,
  allNodes: Map<string, DependencyNode>
): string | null {
  // 1. External packages are ignored
  if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
    return null;
  }

  const fromDir = path.dirname(fromFile);
  const resolvedBase = path.resolve(fromDir, specifier);
  const extensions = [".ts", ".tsx", ".js", ".jsx"];

  // 2. Build candidates
  const candidates = [
    resolvedBase,
    ...extensions.map((ext) => resolvedBase + ext),
    ...extensions.map((ext) => path.join(resolvedBase, "index" + ext)),
  ];

  // 3. Check against known nodes
  for (const candidate of candidates) {
    if (allNodes.has(candidate)) {
      return candidate;
    }
  }

  return null;
}