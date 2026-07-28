// packages/core/src/index.ts

export * from "./types/index.js";
export * from "./config/configLoader.js";
export * from "./export/jsonExporter.js";
export * from "./plugins/pluginRegistry.js";
export * from "./utils/pathUtils.js";
export * from "./analysis/projectGraph.js";

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
import {
  createDartPlugin,
  createGraphqlPlugin,
  createHtmlPlugin,
  createLuaPlugin,
  createPhpPlugin,
  createPowerShellPlugin,
  createRPlugin,
  createRubyPlugin,
  createShellPlugin,
  createSqlPlugin,
  createStylesPlugin,
  createSveltePlugin,
  createSwiftPlugin,
  createVuePlugin,
} from "@cascade/language-expanded";
import { PluginRegistry } from "./plugins/pluginRegistry.js";
import { scanFiles } from "./parser/fileScanner.js";
import { detectEntryPointEvidence } from "./analysis/entryPointDetector.js";
import { buildGraph } from "./graph/graphBuilder.js";
import { detectCycles } from "./graph/cycleDetector.js";
import { findDeadCode } from "./analysis/deadCodeAnalyzer.js";
import { simulateDeletion } from "./analysis/impactSimulator.js";
import { detectProjectIntelligence } from "./analysis/projectGraph.js";

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
  registry.registerPlugin(createPhpPlugin(), { priority: 75 });
  registry.registerPlugin(createRubyPlugin(), { priority: 75 });
  registry.registerPlugin(createSwiftPlugin(), { priority: 75 });
  registry.registerPlugin(createDartPlugin(), { priority: 75 });
  registry.registerPlugin(createShellPlugin(), { priority: 75 });
  registry.registerPlugin(createPowerShellPlugin(), { priority: 75 });
  registry.registerPlugin(createLuaPlugin(), { priority: 75 });
  registry.registerPlugin(createRPlugin(), { priority: 75 });
  registry.registerPlugin(createVuePlugin(), { priority: 90 });
  registry.registerPlugin(createSveltePlugin(), { priority: 90 });
  registry.registerPlugin(createHtmlPlugin(), { priority: 60 });
  registry.registerPlugin(createStylesPlugin(), { priority: 60 });
  registry.registerPlugin(createGraphqlPlugin(), { priority: 65 });
  registry.registerPlugin(createSqlPlugin(), { priority: 40 });

  // 2. Register custom user plugins if provided
  if (options?.customPlugins) {
    options.customPlugins.forEach((plugin) => {
      registry.registerPlugin(plugin, { priority: 75 });
    });
  }

  // 3. Configure priorities & toggles from loaded CascadeConfig
  registry.configureWithCascadeConfig(config);

  // 4. Discover project files using plugins
  let nodes = scanFiles(projectRoot, config, registry);
  let intelligence = detectProjectIntelligence(projectRoot, nodes, registry.getRegisteredPlugins());
  let projects = intelligence.projects;
  for (const [id, override] of Object.entries(config.projectOverrides ?? {})) {
    const project = projects.find((candidate) => candidate.id === id);
    if (!project) continue;
    if (override.name) project.name = override.name;
    if (override.projectType) project.projectType = override.projectType;
  }
  const selected = new Set(config.selectedProjects ?? []);
  if (selected.size) {
    const selectedProjects = projects.filter(
      (project) => selected.has(project.id) || selected.has(project.name)
    );
    nodes = nodes.filter((node) =>
      selectedProjects.some((project) =>
        node.relativePath.startsWith(project.id === "." ? "" : `${project.id}/`)
      )
    );
    intelligence = detectProjectIntelligence(projectRoot, nodes, registry.getRegisteredPlugins());
    projects = intelligence.projects.filter(
      (project) => selected.has(project.id) || selected.has(project.name)
    );
  }
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
    diagnostics: [...diagnostics, ...intelligence.diagnostics],
    pluginManifests,
    projects,
    projectGraph: { ...intelligence.projectGraph, nodes: projects },
    projectImpact: intelligence.projectImpact,
  };
}
