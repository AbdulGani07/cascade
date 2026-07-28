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
  }[];
  edges: {
    from: string;
    to: string;
    kind: string;
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
