import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const cli = path.join(root, "packages/cli/dist/index.js");
const demo = path.join(root, ".cascade-demo");
const run = (args, allowed = [0]) => {
  const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8" });
  if (!allowed.includes(result.status ?? -1)) throw new Error(`${args.join(" ")} exited ${result.status}`);
  return result.stdout;
};

const analysis = JSON.parse(run(["analyze", ".cascade-demo", "--json"], [0, 1]));
const relative = (value) => value.replaceAll("\\", "/");
const edges = analysis.edges.map((edge) => `${relative(edge.from)} -> ${relative(edge.to)}`);
const requireFinding = (condition, message) => {
  if (!condition) throw new Error(message);
};

requireFinding(analysis.cycles.some((cycle) => cycle.some((file) => file.endsWith("discounts.ts"))), "baseline pricing cycle not detected");
requireFinding(analysis.deadFiles.some((file) => file.endsWith("legacy-banner.ts")), "dead file not detected");
requireFinding(analysis.governance.violations.some((item) => item.ruleId === "domain-must-not-import-web"), "governance violation not detected");
requireFinding(analysis.edges.some((edge) => edge.resolutionStatus === "unresolved" && edge.extractedText?.includes("../internal/risk.js")), "unresolved internal import not detected");
requireFinding(edges.some((edge) => edge.includes("services/api") && edge.includes("packages/contracts")), "cross-package dependency not detected");
requireFinding(analysis.impact["packages/contracts/src/order.ts"].allAffected.length >= 5, "shared order contract did not produce the expected high-impact relationship");

const cyclePr = JSON.parse(run(["diff", ".cascade-demo", "--base", "demo-base", "--head", "pr/new-cycle", "--format", "json"]));
requireFinding(cyclePr.introducedCycles.length === 1, "new-cycle PR did not introduce exactly one cycle");
requireFinding(cyclePr.affectedTests.some((item) => item.id.endsWith("pricing.test.ts")), "new-cycle PR did not select the affected pricing test");

const deadPr = JSON.parse(run(["diff", ".cascade-demo", "--base", "demo-base", "--head", "pr/remove-dead-code", "--format", "json"]));
requireFinding(deadPr.changedFiles.some((file) => file.kind === "deleted" && file.path.endsWith("legacy-banner.ts")), "dead-code PR deletion not detected");
requireFinding(
  deadPr.affected.length === 1 &&
    deadPr.affectedTests.length === 0 &&
    deadPr.introducedCycles.length === 0 &&
    deadPr.risk.level === "low",
  "dead-code PR did not remain isolated and low risk"
);

const pricingFile = path.join(demo, "packages/pricing/src/index.ts");
fs.appendFileSync(pricingFile, "\nexport const demoCurrency = \"USD\";\n");
const affected = JSON.parse(run(["affected-tests", ".cascade-demo", "--base", "demo-base", "--format", "json"]));
requireFinding(affected.affectedTests.some((item) => item.id.endsWith("pricing.test.ts")), "affected pricing test not detected");
fs.writeFileSync(pricingFile, fs.readFileSync(pricingFile, "utf8").replace('\nexport const demoCurrency = "USD";\n', ""));

runDemoReportValidation();

function runDemoReportValidation() {
  const generation = spawnSync(
    process.execPath,
    [path.join(root, "examples/cascade-commerce/scripts/generate-reports.mjs")],
    { cwd: root, encoding: "utf8" }
  );
  if (generation.status !== 0) {
    throw new Error(`report generation failed: ${generation.stderr}`);
  }
  const output = path.join(root, "examples/cascade-commerce/media-assets/generated");
  const files = [
    "terminal.txt",
    "report.json",
    "report.md",
    "report.sarif",
    "report.html",
    "dashboard.json"
  ];
  for (const file of files) {
    const content = fs.readFileSync(path.join(output, file), "utf8");
    requireFinding(content.length > 0, `${file} is empty`);
    requireFinding(!content.includes(root), `${file} leaks the repository absolute path`);
    requireFinding(!content.includes(root.replaceAll("\\", "/")), `${file} leaks a POSIX absolute path`);
  }
  JSON.parse(fs.readFileSync(path.join(output, "report.json"), "utf8"));
  JSON.parse(fs.readFileSync(path.join(output, "report.sarif"), "utf8"));
  const dashboard = JSON.parse(fs.readFileSync(path.join(output, "dashboard.json"), "utf8"));
  requireFinding(dashboard.projectRoot === ".", "dashboard dataset root is not portable");
  requireFinding(
    dashboard.generatedAt === "2026-01-15T12:00:00.000Z",
    "dashboard dataset timestamp is not deterministic"
  );
  requireFinding(dashboard.gitImpact?.introducedCycles.length === 1, "dashboard dataset lacks PR cycle evidence");
}

console.log("Verified findings, PR scenarios, portable reports, and the real dashboard dataset.");
