#!/usr/bin/env node

import { Command } from "commander";
import { registerAnalyzeCommand } from "./commands/analyze.js";
import { registerGraphCommand } from "./commands/graph.js";
import { registerImpactCommand } from "./commands/impact.js";
import { registerDeadcodeCommand } from "./commands/deadcode.js";
import { registerDashboardCommand } from "./commands/dashboard.js";
import { registerProjectsCommand } from "./commands/projects.js";
import { registerChangeImpactCommands } from "./commands/changeImpact.js";
import { registerGovernanceCommand } from "./commands/governance.js";
import { registerPlatformCommands } from "./commands/platform.js";

/**
 * Cascade CLI entry point.
 *
 * Creates the Commander.js program, registers all available commands,
 * and executes the command provided through process.argv.
 */

const program = new Command();

program
  .name("cascade")
  .description("Fast, evidence-based dependency intelligence for codebases and monorepos.")
  .version("3.3.1-next.0")
  .option("--quiet", "suppress non-essential terminal output")
  .option("--verbose", "show additional diagnostic detail")
  .option("--debug", "show stack traces for command failures")
  .option("--no-color", "disable ANSI color (also respects NO_COLOR)")
  .addHelpText(
    "after",
    `\nExamples:\n  cascade analyze .\n  cascade diff . --base main --format markdown\n  cascade config validate\n\nGroups:\n  Analysis: analyze, graph, projects, impact, deadcode\n  Change impact: diff, affected, affected-tests, risk, explain\n  Governance: governance\n  Setup: init, config, doctor, cache, completion\n`
  )
  .showSuggestionAfterError(true)
  .showHelpAfterError();

registerAnalyzeCommand(program);
registerGraphCommand(program);
registerImpactCommand(program);
registerDeadcodeCommand(program);
registerDashboardCommand(program);
registerProjectsCommand(program);
registerChangeImpactCommands(program);
registerGovernanceCommand(program);
registerPlatformCommands(program);

try {
  program.parse(process.argv);
} catch (error) {
  const debug = process.argv.includes("--debug");
  console.error(error instanceof Error ? error.message : "Cascade could not complete the command.");
  if (debug && error instanceof Error) console.error(error.stack);
  process.exitCode = 3;
}
