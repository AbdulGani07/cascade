import { Command } from "commander";
import { analyze, writeJsonFile } from "@cascade/core";
import { printHeading, printSuccess, printError } from "../ui/printer.js";
import http from "node:http";
import open from "open";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sirv from "sirv";

function resolveDashboardDist(): string | null {
  const currentFile = fileURLToPath(import.meta.url);
  const currentDir = path.dirname(currentFile);

  const candidates = [
    path.resolve(currentDir, "../../../dashboard/dist"),
    path.resolve(currentDir, "../../dashboard/dist"),
    path.resolve(currentDir, "../node_modules/@cascade/dashboard/dist"),
    path.resolve(currentDir, "../../../node_modules/@cascade/dashboard/dist"),
    path.resolve(process.cwd(), "packages/dashboard/dist"),
    path.resolve(process.cwd(), "dist"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, "index.html"))) {
      return candidate;
    }
  }

  return null;
}

/**
 * Registers the dashboard command.
 *
 * Starts a local-only server to visualize analysis results in the browser.
 * The server only binds to localhost and remains active until the CLI process
 * is terminated.
 *
 * @param program Commander.js command instance.
 */
export function registerDashboardCommand(program: Command): void {
  program
    .command("dashboard <path>")
    .description("Generate analysis and open the local dashboard")
    .action((dir: string) => {
      try {
        const absPath = path.resolve(dir);
        if (!fs.existsSync(absPath)) {
          printError(`Project directory "${dir}" does not exist.`);
          process.exitCode = 2;
          return;
        }

        const result = analyze(absPath);

        const jsonPath = path.join(absPath, "analysis.json");
        writeJsonFile(result, jsonPath);

        const dashboardDist = resolveDashboardDist();
        if (!dashboardDist) {
          printError(
            "Dashboard assets not found. Please build @cascade/dashboard (`pnpm run build`) before opening dashboard."
          );
          process.exitCode = 2;
          return;
        }

        const serveDashboard = sirv(dashboardDist, { single: true });

        const server = http.createServer((req, res) => {
          if (req.url === "/api/analysis") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
            return;
          }

          serveDashboard(req, res);
        });

        server.listen(4000, "127.0.0.1", () => {
          const url = "http://localhost:4000";

          printHeading("Cascade Dashboard");
          printSuccess(`Dashboard running at ${url}`);

          open(url);
        });

        server.on("error", () => {
          server.listen(0, "127.0.0.1", () => {
            const address = server.address();

            if (typeof address === "object" && address) {
              const url = `http://localhost:${address.port}`;

              printHeading("Cascade Dashboard");
              printSuccess(`Dashboard running at ${url}`);

              open(url);
            }
          });
        });
      } catch (e) {
        printError((e as Error).message);
        process.exitCode = 3;
      }
    });
}
