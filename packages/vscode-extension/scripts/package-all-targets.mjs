import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const targets = [
  "win32-x64",
  "win32-arm64",
  "linux-x64",
  "linux-arm64",
  "darwin-x64",
  "darwin-arm64",
];
const extra = process.argv.includes("--pre-release") ? ["--pre-release"] : [];

for (const target of targets) {
  execFileSync(
    process.execPath,
    [path.join(root, "scripts", "package.mjs"), "--package", "--target", target, ...extra],
    {
      cwd: root,
      stdio: "inherit",
    }
  );
}
