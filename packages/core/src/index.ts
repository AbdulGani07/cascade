// packages/core/src/index.ts

// Export all types
export * from "./types/index.js";

// Export configuration loader
export * from "./config/configLoader.js";

// Export JSON serialization helpers
export * from "./export/jsonExporter.js";

// Import core engine components
import { loadConfig } from "./config/configLoader.js";
import { scanFiles } from "./parser/fileScanner.js";
import { detectEntryPoints } from "./analysis/entryPointDetector.js";
import { buildGraph } from "./graph/graphBuilder.js";
import { detectCycles } from "./graph/cycleDetector.js";
import { findDeadFiles } from "./analysis/deadCodeAnalyzer.js";
import { simulateDeletion } from "./analysis/impactSimulator.js";
import { AnalysisResult, ImpactReport } from "./types/index.js";

/**
 * Orchestrates the full analysis pipeline: config loading, scanning, 
 * graph building, and analysis of reachability, cycles, and impact.
 */
export function analyze(projectRoot: string): AnalysisResult {
  const config = loadConfig(projectRoot);
  const nodes = scanFiles(projectRoot, config);
  const entryPointIds = detectEntryPoints(projectRoot, nodes, config);

  // Update nodes with entry point status
  nodes.forEach((n: AnalysisResult["nodes"][number]) => {
    n.isEntryPoint = entryPointIds.includes(n.id);
  });

  const { graph, warnings } = buildGraph(nodes);
  const cycles = detectCycles(graph);
  const deadFiles = findDeadFiles(graph, entryPointIds);

  // Build impact map
  const impact: Record<string, ImpactReport> = {};
  for (const id of graph.nodes.keys()) {
    impact[id] = simulateDeletion(graph, id);
  }

  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    projectRoot,
    nodes,
    edges: graph.edges,
    cycles,
    deadFiles,
    entryPoints: entryPointIds,
    impact,
    warnings,
  };
}