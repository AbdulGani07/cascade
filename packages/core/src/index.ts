// packages/core/src/index.ts
import { performance } from "node:perf_hooks";

export * from "./types/index.js";
export * from "./config/configLoader.js";
export * from "./export/jsonExporter.js";
export * from "./plugins/pluginRegistry.js";
export * from "./utils/pathUtils.js";
export * from "./analysis/projectGraph.js";
export * from "./analysis/gitImpact.js";
export * from "./analysis/governance.js";
export * from "./graph/cycleDetector.js";

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
import { evaluateGovernance } from "./analysis/governance.js";

export interface AnalyzeOptions {
  config?: CascadeConfig;
  customPlugins?: LanguagePlugin[];
  /** Skip the potentially quadratic compatibility impact payload for structural scans. */
  impact?: "full" | "none";
  signal?: AbortSignal;
  timeoutMs?: number;
  onPhase?: (phase: string, elapsedMs: number) => void;
}

/**
 * Orchestrates the full static analysis pipeline using language plugins.
 */
export function analyze(projectRoot: string, options?: AnalyzeOptions): AnalysisResult {
  const analysisStarted = performance.now();
  let phaseStarted = analysisStarted;
  const phase = (name: string) => {
    const now = performance.now();
    options?.onPhase?.(name, now - phaseStarted);
    phaseStarted = now;
  };
  const deadline =
    options?.timeoutMs === undefined
      ? Number.POSITIVE_INFINITY
      : analysisStarted + options.timeoutMs;
  const shouldCancel = () => Boolean(options?.signal?.aborted) || performance.now() > deadline;
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
  phase("pluginLoading");

  // 4. Discover project files using plugins
  let nodes = scanFiles(projectRoot, config, registry, shouldCancel);
  phase("fileDiscovery");
  let intelligence = detectProjectIntelligence(projectRoot, nodes, registry.getRegisteredPlugins());
  let projects = intelligence.projects;
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
  const ignoredProjects = new Set<string>();
  for (const [id, override] of Object.entries(config.projectOverrides ?? {}).sort(([a], [b]) =>
    a.localeCompare(b)
  )) {
    const project = projects.find((candidate) => candidate.id === id);
    if (!project) {
      intelligence.diagnostics.push({
        file: id,
        message: `Project override '${id}' did not match a detected project.`,
        severity: "warning",
        code: "PROJECT_OVERRIDE_NOT_FOUND",
      });
      continue;
    }
    if (override.ignore) ignoredProjects.add(id);
    if (override.name) project.name = override.name;
    if (override.projectType) project.projectType = override.projectType;
  }
  projects = projects.filter((project) => !ignoredProjects.has(project.id));
  if (ignoredProjects.size)
    nodes = nodes.filter(
      (node) =>
        ![...ignoredProjects].some((id) => node.relativePath.startsWith(id === "." ? "" : `${id}/`))
    );
  for (const node of nodes) {
    if (shouldCancel()) throw new Error("Analysis cancelled or timed out");
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
  phase("projectDetection");

  // 5. Detect entry points
  const entryPointEvidence = detectEntryPointEvidence(projectRoot, nodes, config, registry);
  const entryPointIds = entryPointEvidence.map((entry) => entry.file);

  // Update nodes with entry point flag
  nodes.forEach((n) => {
    n.isEntryPoint = entryPointIds.includes(n.id) || entryPointIds.includes(n.relativePath);
  });
  phase("entryPointDetection");

  // 6. Build language-agnostic dependency graph
  const { graph, warnings, diagnostics } = buildGraph(
    nodes,
    registry,
    projectRoot,
    config,
    shouldCancel,
    (name, elapsedMs) => options?.onPhase?.(name, elapsedMs)
  );
  phaseStarted = performance.now();

  // 7. Graph analysis algorithms
  const cycles = detectCycles(graph);
  const deadCodeFindings = findDeadCode(graph, entryPointEvidence, diagnostics);
  const deadFiles = deadCodeFindings.map((finding) => finding.file);
  phase("graphAnalysis");

  // 8. Build impact report map
  const impact: Record<string, ImpactReport> = {};
  if (options?.impact !== "none") {
    for (const id of graph.nodes.keys()) {
      if (shouldCancel()) throw new Error("Analysis cancelled or timed out");
      impact[id] = simulateDeletion(graph, id);
    }
  }
  phase("impactAnalysis");

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
    projectGraph: filterProjectGraph(intelligence.projectGraph, projects),
    projectImpact: Object.fromEntries(
      Object.entries(intelligence.projectImpact)
        .filter(([id]) => projects.some((project) => project.id === id))
        .map(([id, report]) => [
          id,
          {
            ...report,
            directlyAffected: report.directlyAffected.filter((item) =>
              projects.some((project) => project.id === item)
            ),
            allAffected: report.allAffected.filter((item) =>
              projects.some((project) => project.id === item)
            ),
            affectedFiles: report.affectedFiles.filter((file) =>
              nodes.some((node) => node.relativePath === file)
            ),
          },
        ])
    ),
    governance: evaluateGovernance(
      {
        version: "2.0",
        generatedAt: "",
        projectRoot,
        nodes: Array.from(graph.nodes.values()),
        edges: graph.edges,
        cycles,
        deadFiles,
        entryPoints: entryPointIds,
        impact,
        warnings,
      },
      config
    ),
  };
}

function filterProjectGraph(
  graph: NonNullable<AnalysisResult["projectGraph"]>,
  projects: NonNullable<AnalysisResult["projects"]>
): NonNullable<AnalysisResult["projectGraph"]> {
  const ids = new Set(projects.map((project) => project.id));
  const projectToFiles = Object.fromEntries(
    projects.map((project) => [project.id, [...(project.files ?? [])]])
  );
  const filterGroups = (groups: Record<string, string[]>) =>
    Object.fromEntries(
      Object.entries(groups)
        .map(([key, values]) => [key, values.filter((id) => ids.has(id))] as const)
        .filter(([, values]) => values.length)
    );
  return {
    nodes: projects,
    edges: graph.edges.filter((edge) => ids.has(edge.from) && ids.has(edge.to)),
    cycles: graph.cycles.filter((cycle) => cycle.every((id) => ids.has(id))),
    projectToFiles,
    fileToProject: Object.fromEntries(
      Object.entries(graph.fileToProject).filter(([, id]) => ids.has(id))
    ),
    groups: {
      byLanguage: filterGroups(graph.groups.byLanguage),
      byRole: filterGroups(graph.groups.byRole),
      byBuildSystem: filterGroups(graph.groups.byBuildSystem),
      byWorkspace: filterGroups(graph.groups.byWorkspace),
    },
  };
}
