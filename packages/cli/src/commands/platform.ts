import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import { loadCascadeConfig } from "@cascade-code/config";

const configTemplate =
  JSON.stringify(
    {
      entryPoints: ["src/index.ts"],
      ignore: ["**/node_modules/**", "**/dist/**"],
      selectedProjects: [],
      architectureGovernance: { version: "1", rules: [] },
    },
    null,
    2
  ) + "\n";

function cacheDirectory(): string {
  return process.env.CASCADE_CACHE_DIR || path.join(os.homedir(), ".cache", "cascade");
}

export function registerPlatformCommands(program: Command): void {
  program
    .command("init [path]")
    .description("Create a safe starter cascade.config.json without overwriting an existing file")
    .option("--force", "replace an existing configuration file")
    .action((target = ".", options: { force?: boolean }) => {
      const directory = path.resolve(target);
      const destination = path.join(directory, "cascade.config.json");
      if (!fs.existsSync(directory)) throw new Error(`Directory '${target}' does not exist.`);
      if (fs.existsSync(destination) && !options.force) {
        throw new Error(
          "cascade.config.json already exists. Use --force only if replacement is intended."
        );
      }
      fs.writeFileSync(destination, configTemplate, "utf8");
      console.log(`Created ${destination}`);
    });

  const config = program
    .command("config")
    .description("Inspect and validate Cascade configuration");
  config
    .command("validate [path]")
    .description("Validate cascade.config.json and report actionable errors")
    .action((target = ".") => {
      const root = path.resolve(target);
      const configPath = path.join(root, "cascade.config.json");
      if (!fs.existsSync(configPath)) {
        console.log("No cascade.config.json found; Cascade will use documented defaults.");
        return;
      }
      loadCascadeConfig(root);
      console.log(`Configuration is valid: ${configPath}`);
    });

  program
    .command("doctor [path]")
    .description("Check Node, Git, permissions, configuration, and cache readiness")
    .action((target = ".") => {
      const root = path.resolve(target);
      const checks = [
        ["Node.js", process.versions.node],
        ["Repository path", fs.existsSync(root) ? "available" : "missing"],
        [
          "Configuration",
          fs.existsSync(path.join(root, "cascade.config.json")) ? "found" : "defaults",
        ],
        [
          "Git metadata",
          fs.existsSync(path.join(root, ".git")) ? "found" : "not found (Git commands unavailable)",
        ],
        ["Cache", cacheDirectory()],
      ];
      for (const [label, value] of checks) console.log(`${label}: ${value}`);
      if (!fs.existsSync(root)) process.exitCode = 2;
    });

  const cache = program.command("cache").description("Manage local Cascade cache data");
  cache
    .command("path")
    .description("Print the cache directory")
    .action(() => console.log(cacheDirectory()));
  cache
    .command("clear")
    .description("Remove only Cascade's cache directory")
    .option("--yes", "confirm deletion in non-interactive environments")
    .action((options: { yes?: boolean }) => {
      if (!options.yes && !process.stdin.isTTY) {
        throw new Error("Refusing cache removal in CI without --yes.");
      }
      fs.rmSync(cacheDirectory(), { recursive: true, force: true });
      console.log("Cascade cache cleared.");
    });

  program
    .command("completion <shell>")
    .description("Print basic shell completion for bash, zsh, or fish")
    .action((shell: string) => {
      const commands =
        "analyze graph projects diff affected affected-tests risk explain governance init config doctor cache dashboard deadcode impact";
      if (shell === "bash" || shell === "zsh") {
        console.log(`complete -W '${commands}' cascade`);
      } else if (shell === "fish") {
        for (const command of commands.split(" "))
          console.log(`complete -c cascade -f -a '${command}'`);
      } else {
        throw new Error("Supported shells are bash, zsh, and fish.");
      }
    });
}
