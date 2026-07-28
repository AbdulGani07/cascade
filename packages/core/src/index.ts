// packages/core/src/index.ts

export * from "./types/index.js";
export * from "./config/configLoader.js";
export * from "./export/jsonExporter.js";
export * from "./plugins/pluginRegistry.js";
export * from "./utils/pathUtils.js";

import { AnalysisResult, ImpactReport, LanguagePlugin } from "@cascade/plugin-api";
import { loadCascadeConfig, CascadeConfig } from "@cascade/config";
import { createJavaScriptPlugin } from "@cascade/language-javascript";
import { createTypeScriptPlugin } from "@cascade/language-typescript";
import { createPythonPlugin } from "@cascade/language-python";
import { createJavaPlugin } from "@cascade/language-java";
import { createKotlinPlugin } from "@cascade/language-kotlin";
import { createCSharpPlugin } from "@cascade/language-csharp";
import { createGoPlugin } from "@cascade/language-go";
import { createRustPlugin } from "@cascade/language-rust";
import { createCPlugin } from "@cascade/language-c";
import { createCppPlugin } from "@cascade/language-cpp";
import { PluginRegistry } from "./plugins/pluginRegistry.js";
import { scanFiles } from "./parser/fileScanner.js";
import { detectEntryPointEvidence } from "./analysis/entryPointDetector.js";
import { buildGraph } from "./graph/graphBuilder.js";
import { detectCycles } from "./graph/cycleDetector.js";
import { findDeadCode } from "./analysis/deadCodeAnalyzer.js";
import { simulateDeletion } from "./analysis/impactSimulator.js";
import { detectProjects } from "./analysis/projectDetector.js";

export interface AnalyzeOptions {
  config?: CascadeConfig;
  customPlugins?: LanguagePlugin[];
}

/**
 * Orchestrates the full static analysis pipeline using language plugins.
 */
export function analyze(projectRoot: string, options?: AnalyzeOptions): AnalysisResult {
  const config = options?.config || loadCascadeConfig(projectRoot);

  const registry = new PluginRegistry();

  // 1. Register first-party plugins
  registry.registerPlugin(createTypeScriptPlugin(), { priority: 100 });
  registry.registerPlugin(createJavaScriptPlugin(), { priority: 50 });
  registry.registerPlugin(createPythonPlugin(), { priority: 80 });
  registry.registerPlugin(createJavaPlugin(), { priority: 75 });
  registry.registerPlugin(createKotlinPlugin(), { priority: 75 });
  registry.registerPlugin(createCSharpPlugin(), { priority: 75 });
  registry.registerPlugin(createGoPlugin(), { priority: 75 });
  registry.registerPlugin(createRustPlugin(), { priority: 75 });
  registry.registerPlugin(createCppPlugin(), { priority: 72 });
  registry.registerPlugin(createCPlugin(), { priority: 70 });

  // 2. Register custom user plugins if provided
  if (options?.customPlugins) {
    options.customPlugins.forEach((plugin) => {
      registry.registerPlugin(plugin, { priority: 75 });
    });
  }

  // 3. Configure priorities & toggles from loaded CascadeConfig
  registry.configureWithCascadeConfig(config);

  // 4. Discover project files using plugins
  const nodes = scanFiles(projectRoot, config, registry);
  const projects = detectProjects(projectRoot, nodes);
  for (const node of nodes) {
    const project = [...projects]
      .filter((candidate) => {
        const relative = candidate.id === "." ? "" : `${candidate.id.replace(/\\/g, "/")}/`;
        return node.relativePath.startsWith(relative);
      })
      .sort((left, right) => right.id.length - left.id.length)[0];
    if (project) {
      node.project = project.id;
      node.packageOrWorkspace = project.name;
    }
  }

  // 5. Detect entry points
  const entryPointEvidence = detectEntryPointEvidence(projectRoot, nodes, config, registry);
  const entryPointIds = entryPointEvidence.map((entry) => entry.file);

  // Update nodes with entry point flag
  nodes.forEach((n) => {
    n.isEntryPoint = entryPointIds.includes(n.id) || entryPointIds.includes(n.relativePath);
  });

  // 6. Build language-agnostic dependency graph
  const { graph, warnings, diagnostics } = buildGraph(nodes, registry, projectRoot, config);

  // 7. Graph analysis algorithms
  const cycles = detectCycles(graph);
  const deadCodeFindings = findDeadCode(graph, entryPointEvidence, diagnostics);
  const deadFiles = deadCodeFindings.map((finding) => finding.file);

  // 8. Build impact report map
  const impact: Record<string, ImpactReport> = {};
  for (const id of graph.nodes.keys()) {
    impact[id] = simulateDeletion(graph, id);
  }

  // Collect plugin summary manifest
  const pluginManifests = registry.getRegisteredPlugins().map((p) => ({
    id: p.id,
    name: p.name,
    version: p.version,
    supportedExtensions: p.supportedExtensions,
    capabilities: p.capabilities as unknown as Record<string, boolean>,
    analysisLevels: p.analysisLevels,
    limitations: p.limitations,
  }));

  return {
    version: "2.0",
    generatedAt: new Date().toISOString(),
    projectRoot,
    nodes: Array.from(graph.nodes.values()),
    edges: graph.edges,
    cycles,
    deadFiles,
    deadCodeFindings,
    entryPoints: entryPointIds,
    entryPointEvidence,
    impact,
    warnings,
    diagnostics,
    pluginManifests,
    projects,
  };
}
