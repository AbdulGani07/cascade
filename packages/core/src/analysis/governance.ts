import type { CascadeConfig } from "@cascade-code/config";
import type {
  AnalysisResult,
  ArchitectureGovernanceReport,
  ArchitectureViolation,
} from "@cascade-code/plugin-api";

export function evaluateGovernance(
  result: AnalysisResult,
  config: CascadeConfig
): ArchitectureGovernanceReport {
  const policy = config.architectureGovernance;
  const diagnostics: ArchitectureGovernanceReport["diagnostics"] = [];
  if (!policy)
    return {
      schemaVersion: "1.0",
      violations: [],
      diagnostics,
      unusedRules: [],
      contradictoryRules: [],
      boundaries: [],
    };
  const used = new Set<string>();
  const violations: ArchitectureViolation[] = [];
  const contradictions: string[] = [];
  const matches = (value: string, patterns?: string[]) =>
    !patterns?.length ||
    patterns.some((pattern) =>
      new RegExp(
        `^${pattern
          .replace(/[.+^${}()|[\\]\\]/g, "\\$&")
          .replace(/\*\*/g, ".*")
          .replace(/\*/g, "[^/]*")}$`
      ).test(value)
    );
  const projects = new Map(result.nodes.map((node) => [node.relativePath, node.project ?? ""]));
  for (const rule of policy.rules) {
    if (rule.allow?.some((item) => rule.deny?.includes(item))) contradictions.push(rule.id);
    if (rule.expiresAt && new Date(rule.expiresAt).getTime() < Date.now())
      diagnostics.push({
        code: "GOVERNANCE_RULE_EXPIRED",
        message: `Rule '${rule.id}' expired on ${rule.expiresAt}.`,
      });
    for (const edge of result.edges) {
      const from = edge.from.replace(/\\/g, "/");
      const to = edge.to.replace(/\\/g, "/");
      const applies =
        matches(from, rule.from ?? rule.path) &&
        matches(to, rule.to) &&
        matches(edge.importKind, rule.dependencyType) &&
        matches(projects.get(from) ?? "", rule.project);
      if (!applies) continue;
      used.add(rule.id);
      const denied =
        (rule.deny?.some((item) => matches(to, [item])) ?? false) ||
        (rule.only?.length ? !matches(to, rule.only) : false);
      const allowed = rule.allow?.some((item) => matches(to, [item])) ?? false;
      if (
        !denied ||
        allowed ||
        rule.except?.some((item) => matches(from, [item]) || matches(to, [item]))
      )
        continue;
      const suppression = policy.suppressions?.find(
        (item) =>
          item.rule === rule.id &&
          matches(from, [item.path]) &&
          (!item.expiresAt || new Date(item.expiresAt).getTime() >= Date.now())
      );
      violations.push({
        id: `${rule.id}:${from}->${to}`,
        ruleId: rule.id,
        severity: rule.severity ?? "error",
        from,
        to,
        dependencyPath: [from, to],
        message: rule.message ?? `Rule '${rule.id}' forbids ${from} -> ${to}.`,
        remediationUrl: rule.remediationUrl,
        baseline: rule.baseline === true,
        suppressed: Boolean(suppression),
        evidence: [`${edge.importKind} dependency`, ...(edge.evidence ?? [])],
      });
    }
  }
  return {
    schemaVersion: "1.0",
    violations: violations.sort((a, b) => a.id.localeCompare(b.id)),
    diagnostics,
    unusedRules: policy.rules
      .filter((r) => !used.has(r.id))
      .map((r) => r.id)
      .sort(),
    contradictoryRules: [...new Set(contradictions)].sort(),
    boundaries: policy.rules
      .flatMap((r) =>
        (r.allow ?? r.only ?? []).map((to) => ({
          from: (r.from ?? r.path ?? ["*"]).join(","),
          to,
          ruleId: r.id,
        }))
      )
      .sort((a, b) => a.ruleId.localeCompare(b.ruleId)),
  };
}
