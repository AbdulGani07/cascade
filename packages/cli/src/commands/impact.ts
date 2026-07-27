import { Command } from "commander";
import { analyze } from "@cascade/core";
import { printSuccess, printWarning, printHeading, printError } from "../ui/printer.js";
import { renderTable } from "../ui/tableRenderer.js";
import path from "node:path";

/** Registers the 'impact' command to analyze deletion risks. */
export function registerImpactCommand(program: Command): void {
  program
    .command("impact <path>")
    .description("Show the impact of deleting a file")
    .requiredOption("--file <file>", "Target file relative to the project root")
    .option("--json", "Output raw JSON instead of a formatted summary")
    .action(
      async (
        projectPath: string,
        options: {
          file: string;
          json?: boolean;
        },
      ) => {
        try {
          const absolutePath = path.resolve(projectPath);
          const result = analyze(absolutePath);

          const fileId = path.resolve(absolutePath, options.file);
          const impactReport = result.impact[fileId];

          if (!impactReport) {
            printError(
              `File "${options.file}" was not found in the analyzed project.`,
            );
            process.exitCode = 1;
            return;
          }

          if (options.json) {
            console.log(JSON.stringify(impactReport, null, 2));
            return;
          }

          printHeading(`Impact of Deleting ${options.file}`);

          if (impactReport.isSafeToDelete) {
            printSuccess("Safe to delete - no files depend on it");
            return;
          }

          printWarning(
            `${impactReport.allAffected.length} file(s) will be affected.`,
          );

          renderTable(
            ["File"],
            impactReport.allAffected.map((file: string) => [file]),
          );
        } catch (error) {
          printError(
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during impact analysis.",
          );
          process.exitCode = 1;
        }
      },
    );
}
