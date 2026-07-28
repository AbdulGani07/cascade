import { Command } from "commander";
import { analyze, toJson } from "@cascade/core";
import { DependencyEdge } from "@cascade/plugin-api";
import { printHeading, printError } from "../ui/printer.js";
import { renderTable } from "../ui/tableRenderer.js";
import path from "node:path";
import fs from "node:fs";

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
          const absolutePath = path.resolve(projectPath);
          if (!fs.existsSync(absolutePath)) {
            printError(`Project path "${projectPath}" does not exist.`);
            process.exitCode = 2;
            return;
          }

          const result = analyze(absolutePath);

          if (options.json) {
            const parsed = JSON.parse(toJson(result));
            console.log(
              JSON.stringify(
                {
                  nodes: parsed.nodes,
                  edges: parsed.edges,
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
              result.edges.map((edge: DependencyEdge) => [
                edge.from,
                edge.to,
                edge.importKind || edge.kind || "static",
              ])
            )
          );
        } catch (error) {
          if (error instanceof Error) {
            printError(error.message);
          } else {
            printError("An unknown error occurred while generating graph");
          }

          process.exitCode = 3;
        }
      }
    );
}
