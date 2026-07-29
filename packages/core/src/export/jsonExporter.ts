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
} from "@cascade-code/plugin-api";
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
    projectRoot: ".",
    nodes: result.nodes.map((n) => ({
      ...n,
      id: toRelative(n.id),
      absolutePath: toRelative(n.absolutePath),
      relativePath: toRelative(n.relativePath || n.id),
      diagnostics: n.diagnostics?.map((diagnostic) => ({
        ...diagnostic,
        file: toRelative(diagnostic.file),
      })),
    })),
    edges: result.edges.map((e) => ({
      ...e,
      from: toRelative(e.from),
      to: toRelative(e.to),
    })),
    cycles: result.cycles.map((c: string[]) => c.map(toRelative)),
    deadFiles: result.deadFiles.map(toRelative),
    deadCodeFindings: result.deadCodeFindings?.map((finding) => ({
      ...finding,
      file: toRelative(finding.file),
    })),
    entryPoints: result.entryPoints.map(toRelative),
    entryPointEvidence: result.entryPointEvidence?.map((evidence) => ({
      ...evidence,
      file: toRelative(evidence.file),
    })),
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
    projects: result.projects?.map((project) => ({
      ...project,
      rootPath: toRelative(project.rootPath),
      configFiles: project.configFiles.map(toRelative),
      files: project.files?.map(toRelative),
      workspaces: project.workspaces.map((workspace) => ({
        ...workspace,
        path: toRelative(workspace.path),
        relativePath: toRelative(workspace.relativePath),
        manifestPath: workspace.manifestPath ? toRelative(workspace.manifestPath) : undefined,
      })),
      modules: project.modules?.map((module) => ({
        ...module,
        relativePath: toRelative(module.relativePath),
      })),
    })),
    projectGraph: result.projectGraph
      ? {
          ...result.projectGraph,
          nodes: result.projectGraph.nodes.map((project) => ({
            ...project,
            rootPath: toRelative(project.rootPath),
            configFiles: project.configFiles.map(toRelative),
            files: project.files?.map(toRelative),
          })),
          edges: result.projectGraph.edges.map((edge) => ({
            ...edge,
            sourceFiles: edge.sourceFiles.map(toRelative),
          })),
          fileToProject: Object.fromEntries(
            Object.entries(result.projectGraph.fileToProject).map(([file, project]) => [
              toRelative(file),
              project,
            ])
          ),
          projectToFiles: Object.fromEntries(
            Object.entries(result.projectGraph.projectToFiles).map(([project, files]) => [
              project,
              files.map(toRelative),
            ])
          ),
        }
      : undefined,
    projectImpact: result.projectImpact
      ? Object.fromEntries(
          Object.entries(result.projectImpact).map(([project, impact]) => [
            project,
            {
              ...impact,
              affectedFiles: impact.affectedFiles.map(toRelative),
            },
          ])
        )
      : undefined,
    warnings: result.warnings.map((warning) => ({
      ...warning,
      file: toRelative(warning.file),
    })),
    diagnostics: result.diagnostics?.map((diagnostic) => ({
      ...diagnostic,
      file: toRelative(diagnostic.file),
    })),
    governance: result.governance
      ? {
          ...result.governance,
          violations: result.governance.violations.map((violation) => ({
            ...violation,
            from: toRelative(violation.from),
            to: toRelative(violation.to),
            dependencyPath: violation.dependencyPath.map(toRelative),
          })),
          boundaries: result.governance.boundaries.map((boundary) => ({
            ...boundary,
            from: toRelative(boundary.from),
            to: toRelative(boundary.to),
          })),
        }
      : undefined,
  };

  return JSON.stringify(redactSecrets(relativeResult), null, 2);
}

function redactSecrets<T>(value: T): T {
  if (typeof value === "string") return redactString(value) as T;
  if (Array.isArray(value)) return value.map(redactSecrets) as T;
  if (value && typeof value === "object") {
    const safe = Object.create(null) as Record<string, unknown>;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (key === "__proto__" || key === "prototype" || key === "constructor") continue;
      safe[key] = redactSecrets(child);
    }
    return safe as T;
  }
  return value;
}

function redactString(value: string): string {
  return value
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED]")
    .replace(
      /((?:api[_-]?key|token|secret|password|authorization)\s*[:=]\s*["']?)[^\s"',;]+/gi,
      "$1[REDACTED]"
    )
    .replace(
      /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
      "[REDACTED PRIVATE KEY]"
    );
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
