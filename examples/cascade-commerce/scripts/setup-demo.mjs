import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(here, "../../..");
const template = path.resolve(here, "../template");
const target = path.join(repositoryRoot, ".cascade-demo");

if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(template, target, { recursive: true });

const fixedGitEnvironment = {
  ...process.env,
  GIT_AUTHOR_DATE: "2026-01-15T12:00:00Z",
  GIT_COMMITTER_DATE: "2026-01-15T12:00:00Z"
};
const git = (...args) =>
  execFileSync("git", ["-c", `safe.directory=${target.replaceAll("\\", "/")}`, "-C", target, ...args], {
    stdio: "ignore",
    env: fixedGitEnvironment
  });
git("init", "--initial-branch=main");
git("config", "user.name", "Cascade Demo");
git("config", "user.email", "demo@cascade.local");
git("add", ".");
git("commit", "-m", "feat: create commerce platform baseline");
git("tag", "demo-base");

git("switch", "-c", "pr/new-cycle");
fs.writeFileSync(
  path.join(target, "packages/pricing/src/fees.ts"),
  'import { calculateTotal } from "./index.js";\n\nexport const feeLabel = (): string => `fee:${calculateTotal.name}`;\n'
);
fs.appendFileSync(
  path.join(target, "packages/pricing/src/index.ts"),
  '\nexport { feeLabel } from "./fees.js";\n'
);
git("add", ".");
git("commit", "-m", "feat: add order fee labels");

git("switch", "main");
git("switch", "-c", "pr/remove-dead-code");
fs.rmSync(path.join(target, "apps/storefront/src/legacy-banner.ts"));
git("add", "-A");
git("commit", "-m", "refactor: remove unreachable legacy banner");
git("switch", "main");

console.log("Demo repository created at .cascade-demo");
console.log("Refs: demo-base, pr/new-cycle, pr/remove-dead-code");
