import { Command } from "commander";
import { analyze } from "@cascade/core";
import { printSuccess, printHeading, printError } from "../ui/printer.js";
import { renderTable } from "../ui/tableRenderer.js";
import path from "node:path";

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
        },
      ) => {
        try {
          const absolutePath = path.resolve(projectPath);
          const result = analyze(absolutePath);

          if (options.json) {
            console.log(JSON.stringify(result.deadFiles, null, 2));
            return;
          }

          printHeading("Dead Files");

          if (result.deadFiles.length === 0) {
            printSuccess("No dead files found");
            return;
          }

          renderTable(
            ["File"],
            result.deadFiles.map((file: string) => [file]),
          );
        } catch (error) {
          printError(
            error instanceof Error
              ? error.message
              : "An unexpected error occurred during dead code analysis.",
          );
          process.exitCode = 1;
        }
      },
    );
}
