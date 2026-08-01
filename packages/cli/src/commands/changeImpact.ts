import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { analyzeGitImpact } from "@cascade-code/core";
import type { GitImpactReport } from "@cascade-code/plugin-api";
import { printError } from "../ui/printer.js";
import { renderTable } from "../ui/tableRenderer.js";

type Options = {
  base?: string;
  head?: string;
  format?: "terminal" | "json" | "markdown" | "sarif" | "html";
  output?: string;
  item?: string;
};

export function registerChangeImpactCommands(program: Command): void {
  const register = (
    name: string,
    description: string,
    select: (report: GitImpactReport, item?: string) => unknown
  ) =>
    program
      .command(`${name} [path]`)
      .description(description)
      .option("--base <ref>", "base commit, branch, or tag", "HEAD")
      .option("--head <ref>", "head commit, branch, tag, or WORKING_TREE", "WORKING_TREE")
      .option("--format <format>", "terminal, json, markdown, sarif, or html", "terminal")
      .option("--output <file>", "write formatted report to a file")
      .option("--item <id>", "item to explain (explain only)")
      .action((target = ".", options: Options) => {
        try {
          const root = path.resolve(target);
          if (!fs.existsSync(root)) throw new Error(`Repository path '${target}' does not exist.`);
          const report = analyzeGitImpact(root, { base: options.base, head: options.head });
          const payload = select(report, options.item);
          const rendered = render(payload, options.format ?? "terminal");
          if (options.output) fs.writeFileSync(path.resolve(options.output), rendered, "utf8");
          else console.log(rendered);
        } catch (error) {
          printError(error instanceof Error ? error.message : "Git impact analysis failed.");
          process.exitCode = 3;
        }
      });
  register(
    "diff",
    "Compare Git states and report changed files, graph changes, and diagnostics",
    (report) => report
  );
  register(
    "affected",
    "List files, projects, services, and entry points affected by a Git change",
    (report) => ({
      base: report.base,
      head: report.head,
      affected: report.affected,
      diagnostics: report.diagnostics,
    })
  );
  register(
    "affected-tests",
    "List tests with static, convention, mapping, or coverage evidence",
    (report) => ({
      base: report.base,
      head: report.head,
      affectedTests: report.affectedTests,
      disclaimer: "Affected tests are candidates, not proof of sufficient test coverage.",
      diagnostics: report.diagnostics,
    })
  );
  register("risk", "Explain the transparent evidence-based change-risk indicator", (report) => ({
    base: report.base,
    head: report.head,
    risk: report.risk,
    diagnostics: report.diagnostics,
  }));
  register(
    "explain",
    "Explain why one item is affected; omit --item to explain all findings",
    (report, item) => ({
      base: report.base,
      head: report.head,
      affected: report.affected.filter((entry) => !item || entry.id === item),
      affectedTests: report.affectedTests.filter((entry) => !item || entry.id === item),
      diagnostics: report.diagnostics,
    })
  );
}

function render(payload: unknown, format: NonNullable<Options["format"]>): string {
  if (format === "json") return JSON.stringify(payload, null, 2);
  if (format === "sarif") return JSON.stringify(toSarif(payload), null, 2);
  if (format === "markdown") return toMarkdown(payload);
  if (format === "html")
    return `<!doctype html><html><head><meta charset="utf-8"><title>Cascade change impact</title></head><body><pre>${escapeHtml(JSON.stringify(payload, null, 2))}</pre></body></html>`;
  return toTerminal(payload);
}
function toTerminal(payload: unknown): string {
  const value = payload as Record<string, unknown>;
  const lines: string[] = [];
  lines.push("Cascade Git Change Impact");
  if (Array.isArray(value.changedFiles))
    lines.push(
      renderTable(
        ["File", "Kind", "Lines"],
        value.changedFiles.map((file) => {
          const item = file as { path: string; kind: string; changedLines: unknown[] };
          return [item.path, item.kind, String(item.changedLines.length)];
        })
      )
    );
  for (const key of ["affected", "affectedTests"] as const)
    if (Array.isArray(value[key]))
      lines.push(
        renderTable(
          [key, "Confidence", "Evidence"],
          (
            value[key] as Array<{
              id: string;
              confidence: string;
              evidence: Array<{ detail: string }>;
            }>
          ).map((item) => [item.id, item.confidence, item.evidence.map((e) => e.detail).join("; ")])
        )
      );
  if (value.risk) {
    const risk = value.risk as {
      score: number;
      level: string;
      disclaimer: string;
      contributions: Array<{ factor: string; contribution: number; evidence: string[] }>;
    };
    lines.push(`Risk: ${risk.score}/100 (${risk.level})\n${risk.disclaimer}`);
    lines.push(
      renderTable(
        ["Factor", "Contribution", "Evidence"],
        risk.contributions.map((item) => [
          item.factor,
          String(item.contribution),
          item.evidence.join(", "),
        ])
      )
    );
  }
  if (Array.isArray(value.diagnostics) && value.diagnostics.length)
    lines.push(
      renderTable(
        ["Diagnostic", "Message"],
        (value.diagnostics as Array<{ code: string; message: string }>).map((item) => [
          item.code,
          item.message,
        ])
      )
    );
  return lines.join("\n\n");
}
function toMarkdown(payload: unknown): string {
  return `# Cascade Git Change Impact\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`;
}
export function toSarif(payload: unknown): unknown {
  const value = payload as Record<string, unknown>;
  const entries = [
    ...(
      (value.introducedArchitectureViolations as
        Array<{ rule: string; edge: string; from?: string }> | undefined) ?? []
    ).map((item) => ({
      ruleId: item.rule,
      level: "warning",
      message: { text: item.edge },
      locations: [{ physicalLocation: { artifactLocation: { uri: item.from ?? "." } } }],
    })),
    ...(
      (value.introducedUnresolvedDependencies as Array<{ from: string; to: string }> | undefined) ??
      []
    ).map((item) => ({
      ruleId: "CASCADE_GIT_UNRESOLVED",
      level: "warning",
      message: { text: `${item.from} -> ${item.to}` },
      locations: [{ physicalLocation: { artifactLocation: { uri: item.from } } }],
    })),
  ];
  return {
    version: "2.1.0",
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    runs: [{ tool: { driver: { name: "Cascade Git Impact" } }, results: entries }],
  };
}
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
