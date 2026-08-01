import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".github",
  ".changeset",
  ".cache",
  "node_modules",
  "dist",
  "coverage",
  ".cascade-cache",
  ".cascade-demo",
  ".vsix-stage",
  ".vsix-stage2",
]);
const failures = [];

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute));
    else if (entry.name.endsWith(".md")) files.push(absolute);
  }
  return files;
}

function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function checkTarget(source, target) {
  if (
    !target ||
    target.startsWith("#") ||
    /^(https?:|mailto:|data:)/i.test(target) ||
    target.includes("<reviewed-commit-sha>")
  ) {
    return;
  }

  const decoded = decodeURIComponent(target.replace(/^<|>$/g, ""));
  const [filePart, anchor] = decoded.split("#", 2);
  const resolved = path.resolve(path.dirname(source), filePart);
  if (!fs.existsSync(resolved)) {
    failures.push(`${path.relative(root, source)}: missing link target ${target}`);
    return;
  }
  if (anchor && fs.statSync(resolved).isFile() && resolved.endsWith(".md")) {
    const headings = fs
      .readFileSync(resolved, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^#{1,6}\s+/.test(line))
      .map((line) => slug(line.replace(/^#{1,6}\s+/, "")));
    if (!headings.includes(anchor.toLowerCase())) {
      failures.push(`${path.relative(root, source)}: missing heading #${anchor} in ${filePart}`);
    }
  }
}

const help = spawnSync(process.execPath, ["packages/cli/dist/index.js", "--help"], {
  cwd: root,
  encoding: "utf8",
});
if (help.status !== 0) {
  failures.push("CLI is not built; run pnpm run build before documentation validation");
}
const cliCommands = new Set(
  [...(help.stdout ?? "").matchAll(/^\s{2}([a-z][a-z-]*)\b/gm)].map((match) => match[1])
);
cliCommands.add("--help");
cliCommands.add("--version");

const knownConfigKeys = new Set([
  "$schema",
  "root",
  "include",
  "exclude",
  "languages",
  "analysis",
  "reporters",
  "output",
  "architecture",
  "limits",
  "security",
  "git",
  "projects",
  "plugins",
]);
const misspellings = new Map([
  ["explecitely", "explicitly"],
  ["beofre", "before"],
  ["dependancies", "dependencies"],
  ["occurence", "occurrence"],
  ["seperate", "separate"],
]);

for (const file of walk(root).sort()) {
  const relative = path.relative(root, file);
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split(/\r?\n/);
  const headings = lines
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => /^#{1,6}\s+/.test(line));

  const h1Count = headings.filter(({ line }) => line.startsWith("# ")).length;
  if (h1Count !== 1) failures.push(`${relative}: expected one H1, found ${h1Count}`);
  let previousLevel = 0;
  for (const heading of headings) {
    const level = heading.line.match(/^#+/)[0].length;
    if (previousLevel && level > previousLevel + 1) {
      failures.push(`${relative}:${heading.number}: heading level jumps from H${previousLevel} to H${level}`);
    }
    previousLevel = level;
  }

  for (const match of content.matchAll(/!?\[[^\]]*]\(([^)\s]+(?:\s+"[^"]*")?)\)/g)) {
    checkTarget(file, match[1].replace(/\s+"[^"]*"$/, ""));
  }

  for (const match of content.matchAll(/```json\s*\r?\n([\s\S]*?)```/g)) {
    try {
      const value = JSON.parse(match[1]);
      if (
        relative.replaceAll("\\", "/").startsWith("docs/") &&
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        Object.hasOwn(value, "$schema")
      ) {
        for (const key of Object.keys(value)) {
          if (!knownConfigKeys.has(key)) {
            failures.push(`${relative}: unknown documented configuration key "${key}"`);
          }
        }
      }
    } catch (error) {
      failures.push(`${relative}: invalid JSON example (${error.message})`);
    }
  }

  for (const match of content.matchAll(/(?:packages\/cli\/dist\/index\.js|^[>$]?\s*cascade)\s+([a-z-]+)/gm)) {
    if (!cliCommands.has(match[1])) {
      failures.push(`${relative}: undocumented or outdated CLI command "${match[1]}"`);
    }
  }

  const lower = content.toLowerCase();
  for (const [wrong, correct] of misspellings) {
    if (lower.includes(wrong)) failures.push(`${relative}: replace "${wrong}" with "${correct}"`);
  }
}

if (failures.length) {
  console.error(`Documentation validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Documentation validation passed: links, headings, JSON, CLI commands, schema keys, and spelling.");
