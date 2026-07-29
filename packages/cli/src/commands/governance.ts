import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { analyze } from "@cascade-code/core";
import { printError } from "../ui/printer.js";
import { renderTable } from "../ui/tableRenderer.js";

export function registerGovernanceCommand(program: Command): void {
  program
    .command("governance [path]")
    .description("Evaluate versioned architecture-governance rules")
    .option("--format <format>", "terminal, json, markdown, or sarif", "terminal")
    .action((target = ".", options: { format?: string }) => {
      try {
        const root = path.resolve(target);
        if (!fs.existsSync(root)) throw new Error(`Project path '${target}' does not exist.`);
        const report = analyze(root).governance!;
        if (options.format === "json") console.log(JSON.stringify(report, null, 2));
        else if (options.format === "markdown")
          console.log(
            `# Architecture Governance\n\n${report.violations.map((v) => `- **${v.severity}** \`${v.ruleId}\`: ${v.from} → ${v.to}`).join("\n") || "No violations."}`
          );
        else if (options.format === "sarif")
          console.log(
            JSON.stringify(
              {
                version: "2.1.0",
                runs: [
                  {
                    tool: { driver: { name: "Cascade Governance" } },
                    results: report.violations
                      .filter((v) => !v.baseline && !v.suppressed)
                      .map((v) => ({
                        ruleId: v.ruleId,
                        level: v.severity === "error" ? "error" : v.severity,
                        message: { text: v.message },
                        locations: [{ physicalLocation: { artifactLocation: { uri: v.from } } }],
                      })),
                  },
                ],
              },
              null,
              2
            )
          );
        else
          console.log(
            renderTable(
              ["Rule", "Severity", "Dependency", "State"],
              report.violations.map((v) => [
                v.ruleId,
                v.severity,
                `${v.from} -> ${v.to}`,
                v.suppressed ? "suppressed" : v.baseline ? "baseline" : "new",
              ])
            )
          );
      } catch (error) {
        printError(error instanceof Error ? error.message : "Governance evaluation failed.");
        process.exitCode = 3;
      }
    });
}
