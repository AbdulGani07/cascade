import { execFileSync } from "node:child_process";
import path from "node:path";
import process from "node:process";

const root = path.resolve(import.meta.dirname, "..");
const channelIndex = process.argv.indexOf("--channel");
const channel = channelIndex === -1 ? null : process.argv[channelIndex + 1];
if (!["prerelease", "stable"].includes(channel)) {
  throw new Error("Usage: node scripts/dry-run-vscode-release.mjs --channel prerelease|stable");
}
process.env.CASCADE_RELEASE_CANDIDATE = "true";

const run = (command, args, cwd = root) => {
  if (process.platform === "win32") {
    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", command, ...args], {
      cwd,
      stdio: "inherit",
    });
  } else {
    execFileSync(command, args, { cwd, stdio: "inherit" });
  }
};

execFileSync(
  process.execPath,
  [path.join(root, "scripts", "validate-vscode-publish.mjs"), "--channel", channel, "--candidate"],
  {
    cwd: root,
    stdio: "inherit",
  }
);
run("pnpm", ["run", "lint"]);
run("pnpm", ["run", "build"]);
run("pnpm", ["run", "typecheck"]);
run("pnpm", ["run", "test", "--maxWorkers=2", "--testTimeout=30000"]);
run("pnpm", ["run", "test:docs"]);
run("pnpm", ["run", "release:validate"]);
run("pnpm", ["--filter", "cascade-code-intelligence", "run", "package:validate"]);
run("pnpm", [
  "--filter",
  "cascade-code-intelligence",
  "run",
  channel === "stable" ? "package:all-targets:stable" : "package:all-targets",
]);
run("pnpm", ["--filter", "cascade-code-intelligence", "run", "package:size"]);
console.log(
  `Dry run complete for the ${channel} Marketplace channel. No secret was read and nothing was published.`
);
