import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const required = [
  "dist/extension.js",
  "dist/client.js",
  "dist/controller.js",
  "README.md",
  "LICENSE",
];
const missing = required.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error(`Extension package is missing: ${missing.join(", ")}`);
  process.exit(1);
}
if (!manifest.engines?.vscode || !manifest.main || !manifest.contributes?.commands?.length) {
  console.error("Extension manifest is missing engine, entry point, or commands.");
  process.exit(1);
}
const result = {
  name: manifest.name,
  version: manifest.version,
  entryPoint: manifest.main,
  commands: manifest.contributes.commands.map((item) => item.command).sort(),
  files: required,
  validation: "passed",
};
const output = path.join(root, `cascade-code-intelligence-${manifest.version}.vsix-manifest.json`);
if (!process.argv.includes("--validate")) fs.writeFileSync(output, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
