import { Command } from "commander";
import { analyze } from "@cascade/core";
import { printHeading, printError } from "../ui/printer.js";
import { renderTable } from "../ui/tableRenderer.js";
import path from "node:path";

/** Registers the 'graph' command to visualize dependency edges. */
export function registerGraphCommand(program: Command): void {
  program
    .command("graph <path>")
    .option("--json", "output raw JSON instead of a formatted table")
    .action(
      (
        projectPath: string,
        options: {
          json?: boolean;
        }
      ) => {
        try {
          const result = analyze(projectPath);

          if (options.json) {
            console.log(
              JSON.stringify(
                {
                  nodes: result.nodes,
                  edges: result.edges,
                },
                null,
                2
              )
            );
            return;
          }

          printHeading("Dependency Graph");

          console.log(
            renderTable(
              ["From", "To", "Kind"],
              result.edges.map((edge: { from: string; to: string; kind: string }) => [
                edge.from,
                edge.to,
                edge.kind,
              ])
            )
          );
        } catch (error) {
          if (error instanceof Error) {
            printError(error.message);
          } else {
            printError("An unknown error occurred while generating graph");
          }

          process.exitCode = 1;
        }
      }
    );
}
