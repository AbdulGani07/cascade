import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const demo = path.join(root, ".cascade-demo");
const cli = path.join(root, "packages/cli/dist/index.js");
const output = path.join(root, "examples/cascade-commerce/media-assets/generated");

if (!fs.existsSync(demo)) {
  const setup = spawnSync(process.execPath, [
    path.join(root, "examples/cascade-commerce/scripts/setup-demo.mjs")
  ], { cwd: root, stdio: "inherit" });
  if (setup.status !== 0) process.exit(setup.status ?? 1);
}
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

function run(args, file, allowed = [0]) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, NO_COLOR: "1" }
  });
  if (!allowed.includes(result.status ?? -1)) {
    process.stderr.write(result.stderr);
    throw new Error(`Cascade command failed (${result.status}): ${args.join(" ")}`);
  }
  const text = result.stdout
    .replaceAll(demo, ".cascade-demo")
    .replaceAll(demo.replaceAll("\\", "/"), ".cascade-demo");
  fs.writeFileSync(path.join(output, file), text);
}

const comparison = [".cascade-demo", "--base", "demo-base", "--head", "pr/new-cycle"];
run(["analyze", ".cascade-demo", "--compact", "--no-color"], "terminal.txt", [0, 1]);
run(["diff", ...comparison, "--format", "json"], "report.json");
run(["diff", ...comparison, "--format", "markdown"], "report.md");
run(["diff", ...comparison, "--format", "sarif"], "report.sarif");
run(["diff", ...comparison, "--format", "html"], "report.html");
run([
  "dashboard",
  ".cascade-demo",
  "--base",
  "demo-base",
  "--head",
  "pr/new-cycle",
  "--output",
  path.join(output, "dashboard.json"),
  "--output-only",
  "--no-open"
], "dashboard-command.txt");
fs.rmSync(path.join(output, "dashboard-command.txt"));
const dashboardPath = path.join(output, "dashboard.json");
const dashboard = JSON.parse(fs.readFileSync(dashboardPath, "utf8"));
dashboard.generatedAt = "2026-01-15T12:00:00.000Z";
fs.writeFileSync(dashboardPath, `${JSON.stringify(dashboard, null, 2)}\n`);
console.log(`Generated six real CLI artifacts in ${path.relative(root, output)}`);
