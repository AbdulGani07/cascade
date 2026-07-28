import { Command } from "commander";
import path from "node:path";
import fs from "node:fs";
import { analyze, toJson } from "@cascade/core";
import { printError, printHeading, printSuccess, printWarning } from "../ui/printer.js";
import { renderTable } from "../ui/tableRenderer.js";

/**
 * Registers the analyze command that runs a complete Cascade project analysis.
 */
export function registerAnalyzeCommand(program: Command): void {
  program
    .command("analyze <path>")
    .description("Run full analysis and print a summary")
    .option("--json", "output raw JSON instead of a formatted summary")
    .option("--verbose", "show detailed error information")
    .action((projectPath: string, options: { json?: boolean; verbose?: boolean }) => {
      try {
        const absolutePath = path.resolve(projectPath);
        if (!fs.existsSync(absolutePath)) {
          printError(`Project path "${projectPath}" does not exist.`);
          process.exitCode = 2;
          return;
        }

        const result = analyze(absolutePath);

        if (options.json) {
          console.log(toJson(result));
          process.exitCode = result.cycles.length > 0 || result.deadFiles.length > 0 ? 1 : 0;
          return;
        }

        printHeading("CASCADE Architecture Analysis Summary");

        console.log(
          renderTable(
            ["Metric", "Value"],
            [
              ["Total Scanned Modules", String(result.nodes.length)],
              ["Dependency Connections", String(result.edges.length)],
              [
                "Detected Projects",
                String(result.projectGraph?.nodes.length ?? result.projects?.length ?? 0),
              ],
              ["Project Relationships", String(result.projectGraph?.edges.length ?? 0)],
              ["Package Cycles", String(result.projectGraph?.cycles.length ?? 0)],
              ["Detected Entry Points", String(result.entryPoints.length)],
              ["Circular Import Loops", String(result.cycles.length)],
              ["Unreferenced Dead Files", String(result.deadFiles.length)],
              [
                "Unresolved Imports",
                String(
                  result.edges.filter((edge) => edge.resolutionStatus === "unresolved").length
                ),
              ],
              [
                "Languages",
                [...new Set(result.nodes.map((node) => node.language))].sort().join(", "),
              ],
              [
                "Analysis Levels",
                [
                  ...new Set(
                    (result.pluginManifests ?? []).flatMap((plugin) => plugin.analysisLevels ?? [])
                  ),
                ]
                  .sort()
                  .join(", "),
              ],
            ]
          )
        );

        if (result.cycles.length === 0) {
          printSuccess("No dependency cycles found");
        } else {
          printWarning(`${result.cycles.length} dependency cycle(s) detected:`);

          console.log(
            renderTable(
              ["Circular Dependency Loop"],
              result.cycles.map((cycle: string[]) => [cycle.join(" ➔ ")])
            )
          );
        }

        if (result.deadFiles.length === 0) {
          printSuccess("No dead files found");
        } else {
          printWarning(`${result.deadFiles.length} dead file(s) detected:`);

          console.log(
            renderTable(
              ["Dead File Path"],
              result.deadFiles.map((file: string) => [file])
            )
          );
        }

        if (result.entryPoints.length > 0) {
          printHeading("Entry Points");
          console.log(
            renderTable(
              ["Entry Point Path"],
              result.entryPoints.map((entry: string) => [entry])
            )
          );
        }

        process.exitCode = result.cycles.length > 0 || result.deadFiles.length > 0 ? 1 : 0;
      } catch (error) {
        if (error instanceof Error) {
          printError(error.message);

          if (options.verbose) {
            console.error(error.stack);
          }
        } else {
          printError("An unknown error occurred during analysis");
        }

        process.exitCode = 3;
      }
    });
}
