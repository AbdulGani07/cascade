import fs from "node:fs";
import path from "node:path";
import { Command } from "commander";
import { analyze, toJson } from "@cascade/core";
import { printError, printHeading } from "../ui/printer.js";
import { renderTable } from "../ui/tableRenderer.js";

/** Registers project/workspace graph inspection. */
export function registerProjectsCommand(program: Command): void {
  program
    .command("projects <path>")
    .description("Show detected projects, typed relationships, and package cycles")
    .option("--json", "output the project graph as JSON")
    .option("--project <id>", "show impact for one project/workspace")
    .action((projectPath: string, options: { json?: boolean; project?: string }) => {
      const root = path.resolve(projectPath);
      if (!fs.existsSync(root)) {
        printError(`Project path \"${projectPath}\" does not exist.`);
        process.exitCode = 2;
        return;
      }
      const result = analyze(root);
      const graph = result.projectGraph;
      if (!graph) {
        printError("Project intelligence is unavailable for this analysis.");
        process.exitCode = 3;
        return;
      }
      if (options.json) {
        const normalized = JSON.parse(toJson(result));
        console.log(
          JSON.stringify(
            {
              projects: normalized.projects,
              projectGraph: normalized.projectGraph,
              projectImpact: normalized.projectImpact,
            },
            null,
            2
          )
        );
        return;
      }
      if (options.project) {
        const impact = result.projectImpact?.[options.project];
        if (!impact) {
          printError(`Project \"${options.project}\" was not found.`);
          process.exitCode = 2;
          return;
        }
        printHeading(`Project Impact: ${options.project}`);
        console.log(
          renderTable(
            ["Metric", "Value"],
            [
              ["Direct dependents", String(impact.directlyAffected.length)],
              ["All affected projects", String(impact.allAffected.length)],
              ["Affected files", String(impact.affectedFiles.length)],
            ]
          )
        );
        return;
      }
      printHeading("Project & Workspace Intelligence");
      console.log(
        renderTable(
          ["Project", "Role", "Type", "Build", "Languages", "Files"],
          graph.nodes.map((item) => [
            item.id,
            item.role ?? "unknown",
            item.projectType,
            item.buildSystem ?? "-",
            item.languages.join(", "),
            String(item.files?.length ?? 0),
          ])
        )
      );
      if (graph.edges.length) {
        printHeading("Typed Project Relationships");
        console.log(
          renderTable(
            ["From", "To", "Type", "Evidence"],
            graph.edges.map((edge) => [edge.from, edge.to, edge.type, edge.sourceFiles.join(", ")])
          )
        );
      }
      if (graph.cycles.length)
        console.log(
          renderTable(
            ["Package Cycles"],
            graph.cycles.map((cycle) => [cycle.join(" → ")])
          )
        );
    });
}
