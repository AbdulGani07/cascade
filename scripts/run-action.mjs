import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.env.GITHUB_WORKSPACE || process.cwd();
const input = (name, fallback = "") => process.env[`CASCADE_INPUT_${name}`] ?? fallback;
const safeRelative = (value, label) => { if (!value || isAbsolute(value) || value.split(/[\\/]/).includes("..")) throw new Error(`${label} must be a non-empty repository-relative path without '..'.`); return resolve(root, value); };
const bool = (name) => { const value = input(name).toLowerCase(); if (!["true", "false"].includes(value)) throw new Error(`${name} must be true or false.`); return value === "true"; };
const integer = (name, min, max) => { const value = Number(input(name)); if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${name} must be an integer from ${min} to ${max}.`); return value; };
const target = safeRelative(input("PATH", "."), "path"); const output = safeRelative(input("OUTPUT_DIRECTORY", ".cascade-artifacts"), "output-directory");
const config = safeRelative(input("CONFIG", "cascade.config.json"), "config");
const selectedProjects = input("SELECTED_PROJECTS").split(",").map((value) => value.trim()).filter(Boolean);
const failSeverity = input("FAIL_ON_SEVERITY", "error"); if (!["none", "info", "warning", "error"].includes(failSeverity)) throw new Error("fail-on-severity must be none, info, warning, or error.");
const timeout = integer("TIMEOUT_SECONDS", 1, 3600); const maxGraphSize = integer("MAX_GRAPH_SIZE", 0, 10_000_000); const base = input("BASE") || process.env.GITHUB_BASE_REF || "HEAD"; const head = input("HEAD") || process.env.GITHUB_SHA || "HEAD";
mkdirSync(output, { recursive: true });
const cli = resolve(process.env.CASCADE_ACTION_PATH, "packages", "cli", "dist", "index.js");
const run = (args, file) => { const result = spawnSync(process.execPath, [cli, ...args], { cwd: root, encoding: "utf8", timeout: timeout * 1000, env: { ...process.env, CASCADE_CONFIG_PATH: config, CASCADE_SELECTED_PROJECTS: selectedProjects.join(",") } }); if (result.error) throw result.error; if (result.status !== 0 && !result.stdout) throw new Error(result.stderr || `Cascade failed with ${result.status}.`); writeFileSync(file, result.stdout); return result.stdout; };
const jsonPath = resolve(output, "cascade-impact.json"); const markdownPath = resolve(output, "cascade-summary.md"); const sarifPath = resolve(output, "cascade.sarif"); const htmlPath = resolve(output, "cascade-report.html");
const json = JSON.parse(run(["diff", target, "--base", base, "--head", head, "--format", "json"], jsonPath));
run(["diff", target, "--base", base, "--head", head, "--format", "markdown"], markdownPath);
run(["diff", target, "--base", base, "--head", head, "--format", "sarif"], sarifPath);
run(["diff", target, "--base", base, "--head", head, "--format", "html"], htmlPath);
const governance = JSON.parse(run(["governance", target, "--format", "json"], resolve(output, "cascade-governance.json")));
const severityOrder = { none: 4, info: 0, warning: 1, error: 2 }; const activeViolations = governance.violations.filter((item) => !item.baseline && !item.suppressed);
const policyFailures = [
  maxGraphSize && json.affected.length > maxGraphSize ? `affected item count ${json.affected.length} exceeds ${maxGraphSize}` : "",
  bool("FAIL_ON_NEW_CYCLES") && json.introducedCycles.length ? `${json.introducedCycles.length} new cycle(s)` : "",
  bool("FAIL_ON_UNRESOLVED_INTERNAL") && json.introducedUnresolvedDependencies.length ? `${json.introducedUnresolvedDependencies.length} unresolved dependency finding(s)` : "",
  bool("FAIL_ON_ARCHITECTURE_VIOLATIONS") && activeViolations.some((item) => severityOrder[item.severity] >= severityOrder[failSeverity]) ? `${activeViolations.length} governance violation(s)` : "",
].filter(Boolean);
const conclusion = policyFailures.length ? "fail" : "pass"; const summary = `## Cascade change impact\n\nRisk: **${json.risk.level}** (${json.risk.score}/100) · ${json.changedFiles.length} changed files · ${json.affected.length} affected items · ${json.affectedTests.length} test candidates\n\nPolicy: **${conclusion}**${policyFailures.length ? ` — ${policyFailures.join("; ")}` : ""}.\n\nDetailed Markdown, JSON, HTML-compatible JSON, and SARIF files are available as workflow artifacts.\n`;
if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary, { flag: "a" });
if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `conclusion=${conclusion}\nrisk-level=${json.risk.level}\nrisk-score=${json.risk.score}\nmarkdown-summary-path=${relative(root, markdownPath)}\njson-path=${relative(root, jsonPath)}\nsarif-path=${relative(root, sarifPath)}\nhtml-path=${relative(root, htmlPath)}\n`, { flag: "a" });
if (conclusion === "fail") { console.error(`Cascade policy failed: ${policyFailures.join("; ")}`); process.exitCode = 1; }
