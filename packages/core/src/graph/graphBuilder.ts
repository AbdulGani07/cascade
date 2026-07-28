import fs from "node:fs";
import {
  Graph,
  DependencyNode,
  DependencyEdge,
  Warning,
  ParseDiagnostic,
} from "@cascade/plugin-api";
import { PluginRegistry } from "../plugins/pluginRegistry.js";
import { toPosixRelativePath } from "../utils/pathUtils.js";

/**
 * Language-agnostic Graph Builder using PluginRegistry.
 */
export function buildGraph(
  nodes: DependencyNode[],
  pluginRegistry: PluginRegistry,
  projectRoot: string
): { graph: Graph; warnings: Warning[]; diagnostics: ParseDiagnostic[] } {
  const nodesMap = new Map<string, DependencyNode>();
  nodes.forEach((n) => {
    nodesMap.set(n.id, n);
    nodesMap.set(n.relativePath, n);
  });

  const allKnownRelativeFiles = nodes.map((n) => n.relativePath);
  const edges: DependencyEdge[] = [];
  const warnings: Warning[] = [];
  const diagnostics: ParseDiagnostic[] = [];

  for (const node of nodes) {
    const plugin = pluginRegistry.findPluginForFile(node.absolutePath, node.relativePath);

    let content = "";
    try {
      if (fs.existsSync(node.absolutePath)) {
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

    // 1. Safe Parse
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

    if (node.metrics) {
      node.metrics.dependencyCount = extractResult.dependencies.length;
    }

    // 4. Resolve each extracted dependency & construct graph edge
    for (const dep of extractResult.dependencies) {
      const resolution = pluginRegistry.safeResolveModule(plugin, {
        specifier: dep.specifier,
        importerFilePath: node.absolutePath,
        importerRelativePath: node.relativePath,
        projectRoot,
        extractedDependency: dep,
        allKnownFiles: allKnownRelativeFiles,
      });

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

      // Only add edge if resolution is resolved or if target node exists
      if (resolution.resolutionStatus === "resolved" || nodesMap.has(resolvedNodeId)) {
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

  return { graph, warnings, diagnostics };
}
