import { Command } from "commander";
import { analyze } from "@cascade/core";
import { printHeading, printSuccess, printError } from "../ui/printer.js";
import http from "node:http";
import open from "open";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import sirv from "sirv";
import crypto from "node:crypto";

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

        const dashboardDist = resolveDashboardDist();
        if (!dashboardDist) {
          printError(
            "Dashboard assets not found. Please build @cascade/dashboard (`pnpm run build`) before opening dashboard."
          );
          process.exitCode = 2;
          return;
        }

        const serveDashboard = sirv(dashboardDist, { single: true });
        const token = crypto.randomBytes(32).toString("base64url");

        const server = http.createServer((req, res) => {
          res.setHeader("Cache-Control", "no-store");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.setHeader("Referrer-Policy", "no-referrer");
          res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
          res.setHeader(
            "Content-Security-Policy",
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
          );
          const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
          if (requestUrl.searchParams.get("token") === token) {
            res.statusCode = 302;
            res.setHeader(
              "Set-Cookie",
              `cascade_dashboard=${token}; HttpOnly; SameSite=Strict; Path=/`
            );
            res.setHeader("Location", "/");
            res.end();
            return;
          }
          if (req.url === "/api/analysis") {
            if (
              !req.headers.cookie
                ?.split(";")
                .some((value) => value.trim() === `cascade_dashboard=${token}`)
            ) {
              res.statusCode = 403;
              res.end("Forbidden");
              return;
            }
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(result));
            return;
          }

          serveDashboard(req, res);
        });
        server.requestTimeout = 15_000;
        server.headersTimeout = 10_000;
        server.keepAliveTimeout = 5_000;
        server.maxHeadersCount = 100;

        server.listen(4000, "127.0.0.1", () => {
          const url = `http://127.0.0.1:4000/?token=${token}`;

          printHeading("Cascade Dashboard");
          printSuccess(`Dashboard running at ${url}`);

          open(url);
        });

        server.on("error", () => {
          server.listen(0, "127.0.0.1", () => {
            const address = server.address();

            if (typeof address === "object" && address) {
              const url = `http://127.0.0.1:${address.port}/?token=${token}`;

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
