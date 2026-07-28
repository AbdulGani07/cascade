import fs from "node:fs";
import {
  AnalysisResult,
  FileCategory,
  ParseStatus,
  EdgeType,
  ImportKind,
  ResolutionStatus,
  ImpactReport,
  Warning,
  ParseDiagnostic,
} from "@cascade/plugin-api";
import { toPosixRelativePath } from "../utils/pathUtils.js";

/**
 * Serializes AnalysisResult to JSON, converting all internal absolute paths
 * to project-relative paths for schema consistency.
 */
export function toJson(result: AnalysisResult): string {
  const root = result.projectRoot;
  const toRelative = (absPath: string) => toPosixRelativePath(absPath, root);

  const relativeResult: AnalysisResult = {
    ...result,
    nodes: result.nodes.map((n) => ({
      ...n,
      id: toRelative(n.id),
      relativePath: toRelative(n.relativePath || n.id),
    })),
    edges: result.edges.map((e) => ({
      ...e,
      from: toRelative(e.from),
      to: toRelative(e.to),
    })),
    cycles: result.cycles.map((c: string[]) => c.map(toRelative)),
    deadFiles: result.deadFiles.map(toRelative),
    entryPoints: result.entryPoints.map(toRelative),
    impact: Object.fromEntries(
      Object.entries(result.impact).map(([key, val]) => [
        toRelative(key),
        {
          ...val,
          target: toRelative(val.target),
          directlyAffected: val.directlyAffected.map(toRelative),
          allAffected: val.allAffected.map(toRelative),
        },
      ])
    ),
  };

  return JSON.stringify(relativeResult, null, 2);
}

/**
 * Migrates a legacy or version 1.0 AnalysisResult object into version 2.0 schema format.
 */
export function migrateResultToLatest(raw: Record<string, unknown>): AnalysisResult {
  const projectRoot = (raw.projectRoot as string) || process.cwd();

  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];

  const nodes = rawNodes.map((nItem: unknown) => {
    const n = (nItem as Record<string, unknown>) || {};
    const id = toPosixRelativePath((n.id as string) || "", projectRoot);
    return {
      id,
      absolutePath: (n.absolutePath as string) || (n.id as string) || id,
      relativePath: (n.relativePath as string) || id,
      language: (n.language as string) || "javascript",
      fileCategory: (n.fileCategory as FileCategory) || "source",
      isEntryPoint: Boolean(n.isEntryPoint),
      isTestFile: Boolean(n.isTestFile),
      isGeneratedFile: Boolean(n.isGeneratedFile),
      parseStatus: (n.parseStatus as ParseStatus) || "success",
      pluginProvenance: (n.pluginProvenance as { pluginId: string; pluginVersion: string }) || {
        pluginId: "legacy-migrator",
        pluginVersion: "1.0",
      },
    };
  });

  const edges = rawEdges.map((eItem: unknown, idx: number) => {
    const e = (eItem as Record<string, unknown>) || {};
    const from = toPosixRelativePath((e.from as string) || "", projectRoot);
    const to = toPosixRelativePath((e.to as string) || "", projectRoot);
    const kind = (e.kind || e.importKind || "static") as ImportKind;

    return {
      id: (e.id as string) || `${from} -> ${to} [${kind}] #${idx}`,
      from,
      to,
      edgeType: (e.edgeType as EdgeType) || (kind === "re-export" ? "re-export" : "import"),
      importKind: kind,
      isStatic: kind === "static",
      isDynamic: kind === "dynamic",
      isTypeOnly: kind === "type-only",
      isReExport: kind === "re-export",
      isConditional: false,
      resolutionStatus: (e.resolutionStatus as ResolutionStatus) || "resolved",
      extractedText: (e.extractedText as string) || to,
      resolverProvenance: (e.resolverProvenance as { resolverId: string; pluginId: string }) || {
        resolverId: "legacy-migrator",
        pluginId: "legacy",
      },
      confidence: typeof e.confidence === "number" ? e.confidence : 1.0,
    };
  });

  return {
    version: "2.0",
    generatedAt: (raw.generatedAt as string) || new Date().toISOString(),
    projectRoot,
    nodes,
    edges,
    cycles: (Array.isArray(raw.cycles) ? raw.cycles : []) as string[][],
    deadFiles: (Array.isArray(raw.deadFiles) ? raw.deadFiles : []) as string[],
    entryPoints: (Array.isArray(raw.entryPoints) ? raw.entryPoints : []) as string[],
    impact: (raw.impact || {}) as Record<string, ImpactReport>,
    warnings: (Array.isArray(raw.warnings) ? raw.warnings : []) as Warning[],
    diagnostics: (Array.isArray(raw.diagnostics) ? raw.diagnostics : []) as ParseDiagnostic[],
  };
}

/**
 * Writes AnalysisResult to disk.
 */
export function writeJsonFile(result: AnalysisResult, outputPath: string): void {
  fs.writeFileSync(outputPath, toJson(result), "utf-8");
}
