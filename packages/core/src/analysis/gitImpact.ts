import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CascadeConfig, loadCascadeConfig } from "@cascade-code/config";
import {
  AffectedItem,
  AnalysisResult,
  GitChangedFile,
  GitImpactReport,
  ImpactConfidence,
  ImpactEvidence,
  RiskFactorContribution,
} from "@cascade-code/plugin-api";
import { analyze } from "../index.js";

export interface GitImpactOptions {
  base?: string;
  head?: string;
  config?: CascadeConfig;
}

export function analyzeGitImpact(
  repositoryRoot: string,
  options: GitImpactOptions = {}
): GitImpactReport {
  const root = path.resolve(repositoryRoot);
  const config = options.config ?? loadCascadeConfig(root);
  const diagnostics: GitImpactReport["diagnostics"] = [];
  ensureGitRepository(root);
  const base = options.base ?? "HEAD";
  const head = options.head ?? "WORKING_TREE";
  validateGitRevision(base, "base");
  if (head !== "WORKING_TREE") validateGitRevision(head, "head");
  const comparisonMode = head === "WORKING_TREE" ? "working-tree" : "commit";
  const changedFiles = readChangedFiles(root, base, head, diagnostics);
  const baseRoot = checkoutSnapshot(root, base, diagnostics);
  const headRoot = head === "WORKING_TREE" ? root : checkoutSnapshot(root, head, diagnostics);
  try {
    const baseAnalysis = analyze(baseRoot, { config });
    const headAnalysis = analyze(headRoot, { config });
    const affected = collectAffected(changedFiles, baseAnalysis, headAnalysis);
    const affectedTests = collectTests(changedFiles, affected, headAnalysis, config);
    const introducedCycles = cycleDifference(headAnalysis.cycles, baseAnalysis.cycles);
    const removedCycles = cycleDifference(baseAnalysis.cycles, headAnalysis.cycles);
    const introducedArchitectureViolations = architectureViolations(
      headAnalysis,
      baseAnalysis,
      config
    );
    const introducedUnresolvedDependencies = unresolvedDifference(headAnalysis, baseAnalysis);
    const risk = calculateRisk(
      changedFiles,
      affected,
      affectedTests,
      headAnalysis,
      introducedCycles,
      introducedArchitectureViolations.length,
      introducedUnresolvedDependencies.length,
      config
    );
    return {
      schemaVersion: "1.0",
      base,
      head,
      comparisonMode,
      changedFiles,
      affected,
      affectedTests,
      introducedCycles,
      removedCycles,
      introducedArchitectureViolations,
      introducedUnresolvedDependencies,
      risk,
      diagnostics,
    };
  } finally {
    cleanupSnapshot(baseRoot, root);
    cleanupSnapshot(headRoot, root);
  }
}

function validateGitRevision(value: string, label: string): void {
  if (
    !value ||
    value.length > 256 ||
    value.startsWith("-") ||
    /[\u0000-\u001f\u007f\s]/.test(value)
  )
    throw new Error(`Invalid ${label} Git revision.`);
}

function runGit(root: string, args: string[]): string {
  // Trust only the explicit analysis target. This avoids requiring a broad
  // global safe.directory setting when CI or a sandbox runs under another user.
  return execFileSync(
    "git",
    ["-c", `safe.directory=${root.split(path.sep).join("/")}`, "-C", root, ...args],
    {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
}
function ensureGitRepository(root: string): void {
  try {
    runGit(root, ["rev-parse", "--is-inside-work-tree"]);
  } catch (error) {
    throw new Error(
      `'${root}' is not a Git worktree or cannot be read by Git: ${(error as Error).message}`
    );
  }
}
function readChangedFiles(
  root: string,
  base: string,
  head: string,
  diagnostics: GitImpactReport["diagnostics"]
): GitChangedFile[] {
  const args =
    head === "WORKING_TREE"
      ? ["diff", "--name-status", "-M", "-C", base]
      : ["diff", "--name-status", "-M", "-C", base, head];
  let output = "";
  try {
    output = runGit(root, args);
  } catch (error) {
    diagnostics.push({
      code: "GIT_HISTORY_UNAVAILABLE",
      message: `Cannot compare '${base}' and '${head}'. The clone may be shallow or the ref may be missing: ${(error as Error).message}`,
    });
    return [];
  }
  const files = output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line): GitChangedFile => {
      const fields = line.split("\t");
      const status = fields[0];
      const kind = status.startsWith("A")
        ? "added"
        : status.startsWith("D")
          ? "deleted"
          : status.startsWith("R")
            ? "renamed"
            : status.startsWith("C")
              ? "copied"
              : "modified";
      const previousPath = kind === "renamed" || kind === "copied" ? fields[1] : undefined;
      const filePath = previousPath ? fields[2] : fields[1];
      return {
        path: filePath.replace(/\\/g, "/"),
        previousPath: previousPath?.replace(/\\/g, "/"),
        kind,
        changedLines: [],
        symbols: [],
      };
    });
  if (head === "WORKING_TREE") {
    const untracked = runGit(root, ["ls-files", "--others", "--exclude-standard"])
      .split(/\r?\n/)
      .filter(Boolean);
    for (const file of untracked)
      if (!files.some((item) => item.path === file))
        files.push({ path: file, kind: "untracked", changedLines: [], symbols: [] });
  }
  const patchArgs =
    head === "WORKING_TREE" ? ["diff", "--unified=0", base] : ["diff", "--unified=0", base, head];
  const patch = runGit(root, patchArgs);
  let current: GitChangedFile | undefined;
  for (const line of patch.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) current = files.find((file) => file.path === line.slice(6));
    const match = /^@@ .*\+(\d+)(?:,(\d+))? /.exec(line);
    if (current && match)
      current.changedLines.push({
        start: Number(match[1]),
        end: Number(match[1]) + Math.max(0, Number(match[2] ?? "1") - 1),
      });
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}
function checkoutSnapshot(
  root: string,
  ref: string,
  diagnostics: GitImpactReport["diagnostics"]
): string {
  const target = fs.mkdtempSync(path.join(os.tmpdir(), "cascade-git-impact-"));
  try {
    runGit(root, ["worktree", "add", "--detach", target, ref]);
    return target;
  } catch (error) {
    fs.rmSync(target, { recursive: true, force: true });
    diagnostics.push({
      code: "GIT_SNAPSHOT_UNAVAILABLE",
      message: `Cannot materialize '${ref}'; compare only available history. ${(error as Error).message}`,
    });
    throw error;
  }
}
function cleanupSnapshot(snapshot: string, root: string): void {
  if (snapshot !== root && fs.existsSync(snapshot)) {
    try {
      runGit(root, ["worktree", "remove", "--force", snapshot]);
    } catch {
      fs.rmSync(snapshot, { recursive: true, force: true });
    }
  }
}
function confidence(value: number): ImpactConfidence {
  return value >= 0.9 ? "high" : value >= 0.6 ? "medium" : "low";
}
function collectAffected(
  changed: GitChangedFile[],
  base: AnalysisResult,
  head: AnalysisResult
): AffectedItem[] {
  const byId = new Map([...base.nodes, ...head.nodes].map((node) => [node.relativePath, node]));
  const relativeById = new Map(
    [...base.nodes, ...head.nodes].flatMap((node) => [
      [node.id, node.relativePath],
      [node.relativePath, node.relativePath],
    ])
  );
  const relative = (value: string) => relativeById.get(value) ?? value.replace(/\\/g, "/");
  const results = new Map<string, AffectedItem>();
  const add = (
    id: string,
    category: AffectedItem["category"],
    evidence: ImpactEvidence[],
    level: ImpactConfidence
  ) => {
    const prior = results.get(`${category}:${id}`);
    if (prior) prior.evidence.push(...evidence);
    else results.set(`${category}:${id}`, { id, category, confidence: level, evidence });
  };
  for (const file of changed) {
    const node = byId.get(file.path) ?? byId.get(file.previousPath ?? "");
    const symbols = node?.symbols ?? [];
    file.symbols = symbols
      .filter(
        (symbol) =>
          !symbol.location ||
          file.changedLines.some(
            (line) =>
              symbol.location!.startLine <= line.end && symbol.location!.endLine >= line.start
          )
      )
      .map((symbol) => ({ name: symbol.name, exported: symbol.exported, confidence: "high" }));
    add(
      file.path,
      "file",
      [
        {
          kind: "changed-file",
          detail: `${file.kind} file`,
          source: file.path,
          confidence: "high",
        },
      ],
      "high"
    );
    for (const symbol of file.symbols)
      add(
        `${file.path}#${symbol.name}`,
        "symbol",
        [
          {
            kind: "changed-file",
            detail: `changed ${symbol.exported ? "public " : ""}symbol '${symbol.name}'`,
            source: file.path,
            confidence: symbol.confidence,
          },
        ],
        symbol.confidence
      );
    const graph = head.edges.length ? head : base;
    const source = file.path;
    const queue = [source];
    const seen = new Set(queue);
    while (queue.length) {
      const target = queue.shift()!;
      for (const edge of graph.edges.filter(
        (item) => relative(item.to) === target && item.resolutionStatus === "resolved"
      )) {
        const dependent = relative(edge.from);
        if (!seen.has(dependent)) {
          seen.add(dependent);
          queue.push(dependent);
          add(
            dependent,
            "file",
            [
              {
                kind: "dependency",
                detail: `depends on changed file '${source}'`,
                source,
                confidence: confidence(edge.confidence),
              },
            ],
            confidence(edge.confidence)
          );
        }
      }
    }
  }
  for (const project of head.projects ?? []) {
    const impactedFiles = (project.files ?? []).filter((file) =>
      [...results.values()].some((item) => item.category === "file" && item.id === file)
    );
    if (impactedFiles.length)
      add(
        project.id,
        project.role === "service" ? "service" : "project",
        [
          {
            kind: "project",
            detail: `${impactedFiles.length} affected file(s) belong to project`,
            source: project.id,
            confidence: "high",
          },
        ],
        "high"
      );
  }
  for (const entry of head.entryPoints)
    if ([...results.values()].some((item) => item.category === "file" && item.id === entry))
      add(
        entry,
        "entry-point",
        [
          {
            kind: "dependency",
            detail: "entry point is changed or depends on a changed file",
            source: entry,
            confidence: "high",
          },
        ],
        "high"
      );
  return [...results.values()]
    .map((item) => ({
      ...item,
      evidence: item.evidence.sort((a, b) => a.detail.localeCompare(b.detail)),
    }))
    .sort((a, b) => `${a.category}:${a.id}`.localeCompare(`${b.category}:${b.id}`));
}
function collectTests(
  changed: GitChangedFile[],
  affected: AffectedItem[],
  analysis: AnalysisResult,
  config: CascadeConfig
): AffectedItem[] {
  const affectedFiles = new Set(
    affected.filter((item) => item.category === "file").map((item) => item.id)
  );
  const results = new Map<string, AffectedItem>();
  for (const test of analysis.nodes.filter((node) => node.isTestFile)) {
    const importsAffected = analysis.edges.some(
      (edge) => edge.from === test.relativePath && affectedFiles.has(edge.to)
    );
    const convention = changed.some((file) =>
      test.relativePath
        .replace(/(?:\.test|\.spec)?\.[^.]+$/, "")
        .includes(file.path.replace(/\.[^.]+$/, ""))
    );
    const mapped = changed.some((file) =>
      (config.gitImpact?.testMappings?.[file.path] ?? []).includes(test.relativePath)
    );
    const coverage = changed.some((file) =>
      (config.gitImpact?.coverageMap?.[file.path] ?? []).includes(test.relativePath)
    );
    if (importsAffected || convention || mapped || coverage) {
      const evidence: ImpactEvidence[] = [];
      if (importsAffected)
        evidence.push({
          kind: "dependency",
          detail: "test imports affected source",
          confidence: "high",
        });
      if (convention)
        evidence.push({
          kind: "test-convention",
          detail: "test filename convention matches changed source",
          confidence: "medium",
        });
      if (mapped)
        evidence.push({
          kind: "configuration",
          detail: "configured test mapping",
          confidence: "medium",
        });
      if (coverage)
        evidence.push({
          kind: "coverage",
          detail: "user-supplied coverage map",
          confidence: "high",
        });
      results.set(test.relativePath, {
        id: test.relativePath,
        category: "test",
        confidence: evidence.some((item) => item.confidence === "high") ? "high" : "medium",
        evidence,
      });
    }
  }
  return [...results.values()].sort((a, b) => a.id.localeCompare(b.id));
}
function cycleKey(cycle: string[]): string {
  return [...cycle].sort().join("|");
}
function cycleDifference(after: string[][], before: string[][]): string[][] {
  const known = new Set(before.map(cycleKey));
  return after.filter((cycle) => !known.has(cycleKey(cycle))).map((cycle) => [...cycle]);
}
function unresolvedDifference(
  after: AnalysisResult,
  before: AnalysisResult
): GitImpactReport["introducedUnresolvedDependencies"] {
  const old = new Set(
    before.edges
      .filter((edge) => edge.resolutionStatus === "unresolved")
      .map((edge) => `${edge.from}|${edge.to}`)
  );
  return after.edges
    .filter((edge) => edge.resolutionStatus === "unresolved" && !old.has(`${edge.from}|${edge.to}`))
    .map((edge) => ({
      from: edge.from,
      to: edge.to,
      evidence: [
        {
          kind: "graph-diff" as const,
          detail: "unresolved dependency exists only in compared head graph",
          source: edge.extractedText,
          confidence: confidence(edge.confidence),
        },
      ],
    }))
    .sort((a, b) => `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`));
}
function architectureViolations(
  after: AnalysisResult,
  before: AnalysisResult,
  config: CascadeConfig
): GitImpactReport["introducedArchitectureViolations"] {
  const rules = config.gitImpact?.architectureRules ?? [];
  const old = new Set(before.edges.map((edge) => `${edge.from}|${edge.to}`));
  const matches = (value: string, pattern: string) =>
    new RegExp(
      `^${pattern
        .replace(/[.+^${}()|[\\]\\]/g, "\\$&")
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")}$`
    ).test(value);
  return after.edges
    .filter((edge) => !old.has(`${edge.from}|${edge.to}`))
    .flatMap((edge) =>
      rules
        .filter((rule) => matches(edge.from, rule.from) && matches(edge.to, rule.to))
        .map((rule) => ({
          rule: rule.id,
          edge: `${edge.from} -> ${edge.to}`,
          evidence: [
            {
              kind: "configuration" as const,
              detail: `new edge matches architecture rule '${rule.id}'`,
              source: edge.extractedText,
              confidence: confidence(edge.confidence),
            },
          ],
        }))
    )
    .sort((a, b) => `${a.rule}:${a.edge}`.localeCompare(`${b.rule}:${b.edge}`));
}
function calculateRisk(
  changed: GitChangedFile[],
  affected: AffectedItem[],
  tests: AffectedItem[],
  analysis: AnalysisResult,
  cycles: string[][],
  violations: number,
  unresolved: number,
  config: CascadeConfig
): GitImpactReport["risk"] {
  const weights = {
    changedFiles: 1,
    directDependents: 2,
    transitiveDependents: 1,
    entryPoints: 8,
    publicSymbols: 6,
    tests: 1,
    services: 6,
    introducedCycles: 15,
    architectureViolations: 12,
    unresolvedDependencies: 8,
    ownershipBoundaries: 4,
    criticalPath: 10,
    ...config.gitImpact?.riskWeights,
  };
  const direct = affected.filter(
    (item) => item.category === "file" && item.evidence.some((e) => e.kind === "dependency")
  ).length;
  const values: Record<keyof typeof weights, number> = {
    changedFiles: changed.length,
    directDependents: direct,
    transitiveDependents: Math.max(
      0,
      affected.filter((i) => i.category === "file").length - changed.length - direct
    ),
    entryPoints: affected.filter((i) => i.category === "entry-point").length,
    publicSymbols: changed.flatMap((f) => f.symbols).filter((s) => s.exported).length,
    tests: tests.length,
    services: affected.filter((i) => i.category === "service").length,
    introducedCycles: cycles.length,
    architectureViolations: violations,
    unresolvedDependencies: unresolved,
    ownershipBoundaries: new Set(changed.map((file) => file.path.split("/")[0])).size > 1 ? 1 : 0,
    criticalPath: changed.some((file) =>
      (config.gitImpact?.criticalPaths ?? []).some((prefix) => file.path.startsWith(prefix))
    )
      ? 1
      : 0,
  };
  const contributions: RiskFactorContribution[] = Object.entries(values)
    .map(([factor, value]) => ({
      factor,
      weight: weights[factor as keyof typeof weights],
      value,
      contribution: weights[factor as keyof typeof weights] * value,
      evidence: value ? [`${value} observed`] : [],
    }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.contribution - a.contribution || a.factor.localeCompare(b.factor));
  const raw = contributions.reduce((sum, item) => sum + item.contribution, 0);
  const score = Math.min(100, raw);
  const level = score >= 70 ? "critical" : score >= 40 ? "high" : score >= 15 ? "moderate" : "low";
  return {
    score,
    level,
    disclaimer:
      "This transparent change-risk indicator ranks static evidence; it is not a prediction of production failure or test sufficiency.",
    contributions,
  };
}
