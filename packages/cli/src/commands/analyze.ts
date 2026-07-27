import { Command } from "commander";
import path from "node:path";
import { analyze } from "@cascade/core";
import {
  printError,
  printHeading,
  printSuccess,
  printWarning,
} from "../ui/printer.js";
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
        const result = analyze(absolutePath);

        if (options.json) {
          console.log(JSON.stringify(result, null, 2));
          return;
        }

        printHeading("Cascade Analysis");

        printSuccess(`Files scanned: ${result.nodes.length}`);

        if (result.cycles.length === 0) {
          printSuccess("No dependency cycles found");
        } else {
          printWarning(`${result.cycles.length} dependency cycle(s) detected`);

          console.log(
            renderTable(
              ["Cycle"],
              result.cycles.map((cycle: string[]) => [cycle.join(" → ")])
            )
          );
        }

        if (result.deadFiles.length === 0) {
          printSuccess("No dead files found");
        } else {
          printWarning(`${result.deadFiles.length} dead file(s) detected`);

          console.log(
            renderTable(
              ["File"],
              result.deadFiles.map((file: string) => [file])
            )
          );
        }

        printHeading("Entry Points");

        if (result.entryPoints.length === 0) {
          printWarning("No entry points detected");
        } else {
          result.entryPoints.forEach((entry: string) => {
            console.log(`- ${entry}`);
          });
        }
      } catch (error) {
        if (error instanceof Error) {
          printError(error.message);

          if (options.verbose) {
            console.error(error.stack);
          }
        } else {
          printError("An unknown error occurred during analysis");
        }

        process.exitCode = 1;
      }
    });
}
