/** Browser-safe subset of the analysis schema produced by @cascade-code/core. */
export type AnalysisResult = {
  version: "1.0" | "2.0";
  generatedAt: string;
  projectRoot: string;
  nodes: {
    id: string;
    isEntryPoint: boolean;
    language: string;
    project?: string;
    packageOrWorkspace?: string;
    parseStatus?: "success" | "partial" | "failed";
    symbols?: { name: string; kind?: string; exported?: boolean }[];
    pluginProvenance?: { pluginId: string; pluginVersion: string };
  }[];
  edges: {
    id?: string;
    from: string;
    to: string;
    kind?: string;
    edgeType?: string;
    importKind?: string;
    resolutionStatus?: string;
    dependencyCategory?: string;
    confidence?: number;
    extractedText?: string;
    resolverProvenance?: { resolverId: string; pluginId: string };
    evidence?: string[];
  }[];
  cycles: string[][];
  deadFiles: string[];
  entryPoints: string[];
  impact: Record<
    string,
    { directlyAffected: string[]; allAffected: string[]; isSafeToDelete: boolean }
  >;
  warnings: { file: string; message: string }[];
  diagnostics?: { file: string; message: string; severity: string; code?: string }[];
  projects?: {
    id: string;
    name: string;
    projectType: string;
    buildSystem?: string;
    frameworks?: string[];
    modules?: { name: string; relativePath: string; kind?: string }[];
  }[];
  projectGraph?: {
    nodes: {
      id: string;
      name: string;
      projectType: string;
      languages: string[];
      role?: string;
      buildSystem?: string;
      files?: string[];
    }[];
    edges: {
      id: string;
      from: string;
      to: string;
      type: string;
      confidence: number;
      evidence: string[];
      sourceFiles: string[];
    }[];
    cycles: string[][];
    fileToProject: Record<string, string>;
    projectToFiles: Record<string, string[]>;
    groups: {
      byLanguage: Record<string, string[]>;
      byRole: Record<string, string[]>;
      byBuildSystem: Record<string, string[]>;
      byWorkspace: Record<string, string[]>;
    };
  };
  projectImpact?: Record<
    string,
    { directlyAffected: string[]; allAffected: string[]; affectedFiles: string[] }
  >;
  governance?: {
    violations: {
      id: string;
      ruleId: string;
      severity: "info" | "warning" | "error";
      from: string;
      to: string;
      dependencyPath: string[];
      message: string;
      remediationUrl?: string;
      baseline: boolean;
      suppressed: boolean;
      evidence: string[];
    }[];
    diagnostics: { code: string; message: string }[];
    unusedRules: string[];
    contradictoryRules: string[];
    boundaries: { from: string; to: string; ruleId: string }[];
  };
  pluginManifests?: {
    id: string;
    name: string;
    version: string;
    supportedExtensions: string[];
    capabilities: Record<string, boolean>;
    analysisLevels: readonly string[];
    limitations: { knownIssues: string[]; unsupportedFeatures: string[] };
  }[];
  gitImpact?: {
    base: string;
    head: string;
    changedFiles: {
      path: string;
      kind: string;
      previousPath?: string;
      changedLines?: { start: number; end: number }[];
    }[];
    affected: {
      id: string;
      category: string;
      confidence: string;
      evidence?: { detail: string; source?: string; confidence: string }[];
    }[];
    affectedTests: {
      id: string;
      confidence: string;
      category?: string;
      evidence?: { detail: string; source?: string; confidence: string }[];
    }[];
    introducedCycles: string[][];
    removedCycles?: string[][];
    introducedArchitectureViolations?: { rule: string; edge: string }[];
    introducedUnresolvedDependencies?: { from: string; to: string }[];
    graphDiff?: {
      addedEdges: { from: string; to: string }[];
      removedEdges: { from: string; to: string }[];
    };
    risk: {
      score: number;
      level: string;
      disclaimer: string;
      contributions?: { factor: string; contribution: number; evidence: string[] }[];
    };
  };
};

export type AnalysisState = "complete" | "partial" | "empty";

export function validateAnalysis(value: unknown): AnalysisResult {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Malformed analysis report: expected a JSON object.");
  const record = value as Record<string, unknown>;
  if (record.version !== "1.0" && record.version !== "2.0")
    throw new Error(
      `Unsupported analysis schema version: ${String(record.version ?? "missing")}. Supported versions are 1.0 and 2.0.`
    );
  for (const field of ["nodes", "edges", "cycles", "deadFiles", "entryPoints", "warnings"])
    if (!Array.isArray(record[field]))
      throw new Error(`Malformed analysis report: ${field} must be an array.`);
  if (!record.impact || typeof record.impact !== "object" || Array.isArray(record.impact))
    throw new Error("Malformed analysis report: impact must be an object.");
  const nodes = record.nodes as unknown[];
  const edges = record.edges as unknown[];
  if (
    nodes.some(
      (node) =>
        !node || typeof node !== "object" || typeof (node as { id?: unknown }).id !== "string"
    )
  )
    throw new Error("Malformed analysis report: every node must have a string id.");
  if (
    edges.some(
      (edge) =>
        !edge ||
        typeof edge !== "object" ||
        typeof (edge as { from?: unknown }).from !== "string" ||
        typeof (edge as { to?: unknown }).to !== "string"
    )
  )
    throw new Error("Malformed analysis report: every edge must have string from and to fields.");
  return sanitizeForBrowser(value) as AnalysisResult;
}

export function getAnalysisState(data: AnalysisResult): AnalysisState {
  if (data.nodes.length === 0) return "empty";
  if (
    data.warnings.length ||
    data.diagnostics?.length ||
    data.nodes.some((node) => node.parseStatus === "partial" || node.parseStatus === "failed")
  )
    return "partial";
  return "complete";
}

function sanitizeForBrowser<T>(value: T): T {
  if (typeof value === "string") return sanitizeString(value) as T;
  if (Array.isArray(value)) return value.map(sanitizeForBrowser) as T;
  if (value && typeof value === "object") {
    const safe = Object.create(null) as Record<string, unknown>;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (["__proto__", "prototype", "constructor"].includes(key)) continue;
      safe[key] = sanitizeForBrowser(child);
    }
    return safe as T;
  }
  return value;
}

function sanitizeString(value: string): string {
  return value
    .replace(/(?:[A-Za-z]:[\\/]|\\\\)[^\r\n;"']+/g, "[local-path]")
    .replace(/(^|[\s("'=])\/(?!\/)(?:[^/\s]+\/)+[^\s;,"')]+/g, "$1[local-path]");
}

export async function fetchAnalysis(): Promise<AnalysisResult> {
  const response = await fetch("/api/analysis", { cache: "no-store" });
  if (!response.ok)
    throw new Error(`Failed to load analysis report (${response.status} ${response.statusText}).`);
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Malformed analysis report: the response is not valid JSON.");
  }
  return validateAnalysis(payload);
}
