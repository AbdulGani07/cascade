import { DeadCodeFinding, EntryPointEvidence, Graph, ParseDiagnostic } from "@cascade/plugin-api";
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
    if (
      node.isTestFile ||
      node.isGeneratedFile ||
      node.fileCategory === "config" ||
      node.fileCategory === "test" ||
      node.fileCategory === "generated" ||
      node.fileCategory === "asset"
    ) {
      continue;
    }
    if (!reachable.has(nodeId)) {
      dead.push(nodeId);
    }
  }

  return dead;
}

export function findDeadCode(
  graph: Graph,
  entryPointEvidence: EntryPointEvidence[],
  diagnostics: ParseDiagnostic[] | number
): DeadCodeFinding[] {
  const diagnosticList = Array.isArray(diagnostics) ? diagnostics : [];
  const diagnosticsCount = Array.isArray(diagnostics) ? diagnostics.length : diagnostics;
  if (diagnosticList.some((diagnostic) => diagnostic.code === "PY_DYNAMIC_IMPORT_UNRESOLVED"))
    return [];
  const strongRoots = entryPointEvidence.filter((entry) => entry.confidence >= 0.8);
  if (strongRoots.length === 0) return [];
  const dead = findDeadFiles(
    graph,
    strongRoots.map((entry) => entry.file)
  );
  const resolutionPenalty = Math.min(0.35, diagnosticsCount * 0.02);
  const rootConfidence = Math.min(...strongRoots.map((entry) => entry.confidence));
  return dead.map((file) => ({
    file,
    confidence: Math.max(0.5, Math.min(0.99, rootConfidence - resolutionPenalty)),
    evidence: [
      `Unreachable from ${strongRoots.length} entry root(s)`,
      `${diagnosticsCount} unresolved or parse diagnostic(s) may reduce certainty`,
      "Tests, generated files, configuration, and assets are excluded",
    ],
  }));
}
