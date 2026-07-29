import { Command } from "commander";
import { analyze, toJson } from "@cascade-code/core";
import { printSuccess, printWarning, printHeading, printError } from "../ui/printer.js";
import { renderTable } from "../ui/tableRenderer.js";
import path from "node:path";
import fs from "node:fs";

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
        }
      ) => {
        try {
          const absolutePath = path.resolve(projectPath);
          if (!fs.existsSync(absolutePath)) {
            printError(`Project path "${projectPath}" does not exist.`);
            process.exitCode = 2;
            return;
          }

          const result = analyze(absolutePath);
          const normalizedJson = JSON.parse(toJson(result));

          const normalizedFile = options.file.replace(/\\/g, "/").replace(/^\.\//, "");
          const fileKey = Object.keys(normalizedJson.impact).find(
            (k) => k === normalizedFile || k.endsWith(normalizedFile)
          );

          const impactReport = fileKey ? normalizedJson.impact[fileKey] : null;

          if (!impactReport) {
            printError(`File "${options.file}" was not found in the analyzed project.`);
            process.exitCode = 2;
            return;
          }

          if (options.json) {
            console.log(JSON.stringify(impactReport, null, 2));
            process.exitCode = impactReport.isSafeToDelete ? 0 : 1;
            return;
          }

          printHeading(`Impact of Deleting ${options.file}`);

          if (impactReport.isSafeToDelete) {
            printSuccess("Safe to delete — no other files depend on this module.");
            process.exitCode = 0;
            return;
          }

          printWarning(
            `Impact Risk Detected: ${impactReport.allAffected.length} file(s) directly or transitively affected.`
          );

          if (impactReport.directlyAffected.length > 0) {
            printHeading("Directly Affected Dependents");
            console.log(
              renderTable(
                ["Direct Dependent File"],
                impactReport.directlyAffected.map((file: string) => [file])
              )
            );
          }

          if (impactReport.allAffected.length > 0) {
            printHeading("All Downstream Affected Files (Blast Radius)");
            console.log(
              renderTable(
                ["Affected Downstream File"],
                impactReport.allAffected.map((file: string) => [file])
              )
            );
          }

          process.exitCode = 1;
        } catch (error) {
          printError(
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during impact analysis."
          );
          process.exitCode = 3;
        }
      }
    );
}
