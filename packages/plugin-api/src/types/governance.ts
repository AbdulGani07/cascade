import type { AnalysisResult } from "./graph.js";

export type GovernanceSeverity = "info" | "warning" | "error";
export interface ArchitectureRule {
  id: string;
  from?: string[];
  to?: string[];
  allow?: string[];
  deny?: string[];
  only?: string[];
  except?: string[];
  scope?: string[];
  language?: string[];
  project?: string[];
  workspace?: string[];
  path?: string[];
  symbol?: string[];
  dependencyType?: string[];
  transitive?: boolean;
  severity?: GovernanceSeverity;
  message?: string;
  remediationUrl?: string;
  ownership?: string[];
  expiresAt?: string;
  baseline?: boolean;
}
export interface ArchitectureSuppression {
  rule: string;
  path: string;
  reason: string;
  expiresAt?: string;
}
export interface ArchitectureViolation {
  id: string;
  ruleId: string;
  severity: GovernanceSeverity;
  from: string;
  to: string;
  dependencyPath: string[];
  message: string;
  remediationUrl?: string;
  baseline: boolean;
  suppressed: boolean;
  evidence: string[];
}
export interface ArchitectureGovernanceReport {
  schemaVersion: "1.0";
  violations: ArchitectureViolation[];
  diagnostics: Array<{ code: string; message: string }>;
  unusedRules: string[];
  contradictoryRules: string[];
  boundaries: Array<{ from: string; to: string; ruleId: string }>;
}
export interface GovernanceRulePlugin {
  id: string;
  evaluate(result: AnalysisResult): ArchitectureViolation[];
}
