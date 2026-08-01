export type GitChangeKind = "added" | "modified" | "deleted" | "renamed" | "copied" | "untracked";
export type ImpactConfidence = "high" | "medium" | "low";

export interface GitChangedFile {
  path: string;
  previousPath?: string;
  kind: GitChangeKind;
  changedLines: Array<{ start: number; end: number }>;
  symbols: Array<{ name: string; exported: boolean; confidence: ImpactConfidence }>;
}

export interface ImpactEvidence {
  kind:
    | "changed-file"
    | "dependency"
    | "project"
    | "test-convention"
    | "coverage"
    | "configuration"
    | "graph-diff";
  detail: string;
  source?: string;
  confidence: ImpactConfidence;
}

export interface AffectedItem {
  id: string;
  category: "file" | "symbol" | "project" | "entry-point" | "test" | "service";
  confidence: ImpactConfidence;
  evidence: ImpactEvidence[];
}

export interface RiskFactorContribution {
  factor: string;
  weight: number;
  value: number;
  contribution: number;
  evidence: string[];
}

export interface ChangeRiskReport {
  score: number;
  level: "low" | "moderate" | "high" | "critical";
  disclaimer: string;
  contributions: RiskFactorContribution[];
}

export interface GitImpactReport {
  schemaVersion: "1.0";
  base: string;
  head: string;
  comparisonMode: "commit" | "working-tree";
  changedFiles: GitChangedFile[];
  affected: AffectedItem[];
  affectedTests: AffectedItem[];
  introducedCycles: string[][];
  removedCycles: string[][];
  introducedArchitectureViolations: Array<{
    rule: string;
    edge: string;
    from: string;
    to: string;
    evidence: ImpactEvidence[];
  }>;
  introducedUnresolvedDependencies: Array<{ from: string; to: string; evidence: ImpactEvidence[] }>;
  risk: ChangeRiskReport;
  diagnostics: Array<{ code: string; message: string }>;
}
