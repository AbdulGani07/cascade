import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import {
  Graph,
  DependencyNode,
  DependencyEdge,
  Warning,
  ParseDiagnostic,
} from "@cascade-code/plugin-api";
import { PluginRegistry } from "../plugins/pluginRegistry.js";
import { toPosixRelativePath } from "../utils/pathUtils.js";
import { CascadeConfig } from "@cascade-code/config";
import { ProjectModuleResolver } from "../resolution/projectResolver.js";

/**
 * Language-agnostic Graph Builder using PluginRegistry.
 */
export function buildGraph(
  nodes: DependencyNode[],
  pluginRegistry: PluginRegistry,
  projectRoot: string,
  config: CascadeConfig,
  shouldCancel?: () => boolean,
  onTiming?: (
    phase: "parsing" | "moduleResolution" | "graphConstruction",
    elapsedMs: number
  ) => void
): { graph: Graph; warnings: Warning[]; diagnostics: ParseDiagnostic[] } {
  const canonicalRoot = fs.realpathSync(projectRoot);
  const nodesMap = new Map<string, DependencyNode>();
  nodes.forEach((n) => {
    nodesMap.set(n.id, n);
    nodesMap.set(n.relativePath, n);
  });

  const allKnownRelativeFiles = nodes.map((n) => n.relativePath);
  const edges: DependencyEdge[] = [];
  const warnings: Warning[] = [];
  const diagnostics: ParseDiagnostic[] = [];
  const projectResolver = new ProjectModuleResolver(projectRoot, allKnownRelativeFiles, config);
  let parsingMs = 0;
  let resolutionMs = 0;
  const graphStarted = performance.now();

  for (const node of nodes) {
    if (shouldCancel?.()) throw new Error("Analysis cancelled");
    const plugin = pluginRegistry.findPluginForFile(node.absolutePath, node.relativePath);

    let content = "";
    try {
      if (fs.existsSync(node.absolutePath)) {
        const canonicalFile = fs.realpathSync(node.absolutePath);
        const relative = path.relative(canonicalRoot, canonicalFile);
        if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative))
          throw new Error("SECURITY_PATH_ESCAPE: file resolved outside project root");
        const stat = fs.statSync(canonicalFile);
        if (stat.size > (config.maxFileSizeBytes ?? Number.POSITIVE_INFINITY))
          throw new Error("RESOURCE_LIMIT: file grew beyond maxFileSizeBytes after discovery");
        content = fs.readFileSync(node.absolutePath, "utf-8");
      }
    } catch (err) {
      warnings.push({
        file: node.relativePath,
        message: `Failed to read file: ${(err as Error).message}`,
      });
      continue;
    }

    if (!plugin) {
      continue;
    }
    if (node.metrics) node.metrics.lineCount = countLines(content);

    // 1. Safe Parse
    const parseStarted = performance.now();
    const parseResult = pluginRegistry.safeParse(plugin, {
      filePath: node.absolutePath,
      relativePath: node.relativePath,
      content,
    });

    if (parseResult.diagnostics && parseResult.diagnostics.length > 0) {
      diagnostics.push(...parseResult.diagnostics);
      parseResult.diagnostics.forEach((d) => {
        warnings.push({ file: node.relativePath, message: d.message });
      });
    }

    node.parseStatus = parseResult.status;

    // 2. Safe Dependency Extraction
    const extractResult = pluginRegistry.safeExtractDependencies(plugin, {
      filePath: node.absolutePath,
      relativePath: node.relativePath,
      content,
      ast: parseResult.ast,
    });

    if (extractResult.diagnostics && extractResult.diagnostics.length > 0) {
      diagnostics.push(...extractResult.diagnostics);
    }

    // 3. Safe Symbol Extraction if capable
    if (plugin.capabilities.symbolExtraction) {
      const symResult = pluginRegistry.safeExtractSymbols(plugin, {
        filePath: node.absolutePath,
        relativePath: node.relativePath,
        content,
        ast: parseResult.ast,
      });
      node.symbols = symResult.declarations;
      if (node.metrics) {
        node.metrics.symbolCount = symResult.declarations.length;
      }
    }
    parsingMs += performance.now() - parseStarted;

    if (node.metrics) {
      node.metrics.dependencyCount = extractResult.dependencies.length;
    }

    // 4. Resolve each extracted dependency & construct graph edge
    for (const dep of extractResult.dependencies) {
      if (shouldCancel?.()) throw new Error("Analysis cancelled");
      const resolutionStarted = performance.now();
      let resolution =
        plugin.id === "cascade-language-javascript" || plugin.id === "cascade-language-typescript"
          ? projectResolver.resolve(dep.specifier, node.absolutePath, node.relativePath, dep)
          : pluginRegistry.safeResolveModule(plugin, {
              specifier: dep.specifier,
              importerFilePath: node.absolutePath,
              importerRelativePath: node.relativePath,
              projectRoot,
              extractedDependency: dep,
              allKnownFiles: allKnownRelativeFiles,
            });
      const resolvedCandidate = resolution.resolvedFilePath
        ? path.resolve(resolution.resolvedFilePath)
        : resolution.resolvedRelativePath
          ? path.resolve(projectRoot, resolution.resolvedRelativePath)
          : undefined;
      if (resolvedCandidate && !isInside(canonicalRoot, canonicalPath(resolvedCandidate))) {
        resolution = {
          resolutionStatus: "unresolved",
          confidence: 0,
          resolverId: "cascade-root-boundary",
          diagnostics: [
            {
              file: node.relativePath,
              message: "Resolver result was rejected because it escapes the analysis root.",
              severity: "warning",
              code: "SECURITY_PATH_ESCAPE",
              location: dep.sourceLocation,
            },
          ],
        };
      }
      resolutionMs += performance.now() - resolutionStarted;

      if (resolution.diagnostics) {
        diagnostics.push(...resolution.diagnostics);
      }

      let targetId = dep.specifier;
      if (resolution.resolvedRelativePath) {
        targetId = resolution.resolvedRelativePath;
      } else if (resolution.resolvedFilePath) {
        targetId = toPosixRelativePath(resolution.resolvedFilePath, projectRoot);
      }

      // Check if target is a known node ID or relative path
      let resolvedNodeId = targetId;
      if (nodesMap.has(targetId)) {
        resolvedNodeId = nodesMap.get(targetId)!.id;
      }

      // Preserve unresolved and external edges with their resolution status.
      // Graph traversals ignore targets that are not known nodes.
      {
        const edgeId = `${node.id} -> ${resolvedNodeId} [${dep.importKind}]`;

        // Check for cross-language edge
        const targetNode = nodesMap.get(resolvedNodeId);
        const isCrossLanguage = targetNode ? targetNode.language !== node.language : false;

        const edge: DependencyEdge = {
          id: edgeId,
          from: node.id,
          to: resolvedNodeId,
          kind: dep.importKind,
          edgeType: isCrossLanguage
            ? "cross-language"
            : dep.isReExport
              ? "re-export"
              : dep.isTypeOnly
                ? "type-import"
                : dep.isDynamic
                  ? "dynamic-import"
                  : dep.importKind === "reference"
                    ? "reference"
                    : "import",
          importKind: dep.importKind,
          isStatic: dep.isStatic,
          isDynamic: dep.isDynamic,
          isTypeOnly: dep.isTypeOnly,
          isReExport: dep.isReExport,
          isConditional: dep.isConditional,
          resolutionStatus: resolution.resolutionStatus,
          extractedText: dep.specifier,
          sourceLocation: dep.sourceLocation,
          resolverProvenance: {
            resolverId: resolution.resolverId,
            pluginId: plugin.id,
          },
          confidence: resolution.confidence,
          dependencyCategory: resolution.dependencyCategory,
          evidence: [...(dep.evidence ?? []), ...(resolution.evidence ?? [])],
        };

        edges.push(edge);
      }
    }
  }

  // Deduplicate nodes in map by primary node.id
  const finalNodesMap = new Map<string, DependencyNode>();
  nodes.forEach((n) => finalNodesMap.set(n.id, n));

  // Build adjacency lookup maps for fast neighbor search
  const neighborsMap = new Map<string, Set<string>>();
  const incomingMap = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!neighborsMap.has(edge.from)) neighborsMap.set(edge.from, new Set());
    neighborsMap.get(edge.from)!.add(edge.to);

    if (!incomingMap.has(edge.to)) incomingMap.set(edge.to, new Set());
    incomingMap.get(edge.to)!.add(edge.from);
  }

  const graph: Graph = {
    nodes: finalNodesMap,
    edges,
    neighborsOf: (id: string) => Array.from(neighborsMap.get(id) || []),
    incomingTo: (id: string) => Array.from(incomingMap.get(id) || []),
  };
  onTiming?.("parsing", parsingMs);
  onTiming?.("moduleResolution", resolutionMs);
  onTiming?.("graphConstruction", performance.now() - graphStarted - parsingMs - resolutionMs);

  return { graph, warnings, diagnostics };
}

function canonicalPath(candidate: string): string {
  try {
    return fs.realpathSync(candidate);
  } catch {
    return path.resolve(candidate);
  }
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function countLines(content: string): number {
  if (content.length === 0) return 0;
  let lines = 1;
  for (let index = 0; index < content.length; index++) {
    if (content.charCodeAt(index) === 10) lines++;
  }
  return lines;
}
