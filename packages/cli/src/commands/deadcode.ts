import { Command } from "commander";
import { analyze, toJson } from "@cascade/core";
import { printSuccess, printWarning, printHeading, printError } from "../ui/printer.js";
import { renderTable } from "../ui/tableRenderer.js";
import path from "node:path";
import fs from "node:fs";

/** Registers the 'deadcode' command to list unreachable files. */
export function registerDeadcodeCommand(program: Command): void {
  program
    .command("deadcode <path>")
    .description("List files unreachable from any entry point")
    .option("--json", "Output raw JSON instead of a formatted summary")
    .action(
      async (
        projectPath: string,
        options: {
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

          if (options.json) {
            console.log(JSON.stringify(normalizedJson.deadFiles, null, 2));
            process.exitCode = normalizedJson.deadFiles.length > 0 ? 1 : 0;
            return;
          }

          printHeading("Dead Code Analysis");

          if (normalizedJson.deadFiles.length === 0) {
            printSuccess("No dead or unreachable files found across entry points.");
            process.exitCode = 0;
            return;
          }

          printWarning(`Found ${normalizedJson.deadFiles.length} unused / dead file(s)`);

          console.log(
            renderTable(
              ["Unreferenced Dead File Path"],
              normalizedJson.deadFiles.map((file: string) => [file])
            )
          );

          process.exitCode = 1;
        } catch (error) {
          printError(
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during dead code analysis."
          );
          process.exitCode = 3;
        }
      }
    );
}
