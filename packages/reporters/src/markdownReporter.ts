import { AnalysisResult, Reporter, ReporterOptions } from "@cascade/plugin-api";
import { markdownCode, safeReportResult } from "./security.js";

export class MarkdownReporter implements Reporter {
  id = "cascade-reporter-markdown";
  name = "Markdown Summary Reporter";
  format = "markdown" as const;

  render(result: AnalysisResult, _options?: ReporterOptions): string {
    result = safeReportResult(result);
    const lines: string[] = [];
    lines.push(`# Cascade Analysis Report`);
    lines.push(`**Generated at**: ${result.generatedAt}`);
    lines.push(`**Project Root**: \`.\``);
    lines.push(`**Schema Version**: ${result.version}`);
    lines.push(``);
    lines.push(`## Summary Metrics`);
    lines.push(`- **Total Files**: ${result.nodes.length}`);
    lines.push(`- **Total Dependency Edges**: ${result.edges.length}`);
    lines.push(`- **Circular Dependency Loops**: ${result.cycles.length}`);
    lines.push(`- **Unreachable / Dead Code Files**: ${result.deadFiles.length}`);
    lines.push(``);

    if (result.cycles.length > 0) {
      lines.push(`## Circular Dependencies`);
      result.cycles.forEach((cycle: string[], idx: number) => {
        lines.push(`${idx + 1}. \`${cycle.map(markdownCode).join(" -> ")}\``);
      });
      lines.push(``);
    }

    if (result.deadFiles.length > 0) {
      lines.push(`## Dead Code Files`);
      result.deadFiles.forEach((f: string) => {
        lines.push(`- \`${markdownCode(f)}\``);
      });
      lines.push(``);
    }

    return lines.join("\n");
  }
}
