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

/**
 * Cascade CLI entry point.
 *
 * Creates the Commander.js program, registers all available commands,
 * and executes the command provided through process.argv.
 */

const program = new Command();

program
  .name("cascade")
  .description("Predict the impact of code changes before you make them.")
  .version("3.1.1");

registerAnalyzeCommand(program);
registerGraphCommand(program);
registerImpactCommand(program);
registerDeadcodeCommand(program);
registerDashboardCommand(program);
registerProjectsCommand(program);
registerChangeImpactCommands(program);
registerGovernanceCommand(program);

program.parse(process.argv);
