/**
 * Local copy of the analysis result shape produced by the core package.
 * This avoids a runtime dependency on the core package in the browser bundle.
 */
export type AnalysisResult = {
  version: string;
  generatedAt: string;
  projectRoot: string;
  nodes: {
    id: string;
    isEntryPoint: boolean;
    language: string;
    project?: string;
    packageOrWorkspace?: string;
  }[];
  edges: {
    from: string;
    to: string;
    kind: string;
    resolutionStatus?: string;
    dependencyCategory?: string;
    confidence?: number;
    evidence?: string[];
  }[];
  cycles: string[][];
  deadFiles: string[];
  entryPoints: string[];
  impact: Record<
    string,
    {
      directlyAffected: string[];
      allAffected: string[];
      isSafeToDelete: boolean;
    }
  >;
  warnings: {
    file: string;
    message: string;
  }[];
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
  pluginManifests?: {
    id: string;
    name: string;
    version: string;
    supportedExtensions: string[];
    capabilities: Record<string, boolean>;
    analysisLevels: string[];
    limitations: { knownIssues: string[]; unsupportedFeatures: string[] };
  }[];
  gitImpact?: {
    base: string;
    head: string;
    changedFiles: { path: string; kind: string }[];
    affected: { id: string; category: string; confidence: string }[];
    affectedTests: { id: string; confidence: string }[];
    introducedCycles: string[][];
    risk: { score: number; level: string; disclaimer: string };
  };
};

/**
 * Fetches the locally generated analysis.json file.
 */
export async function fetchAnalysis(): Promise<AnalysisResult> {
  const response = await fetch("/api/analysis");

  if (!response.ok) {
    throw new Error(`Failed to load analysis.json (${response.status} ${response.statusText})`);
  }

  return (await response.json()) as AnalysisResult;
}
