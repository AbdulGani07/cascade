#!/usr/bin/env node

import { Command } from "commander";
import { registerAnalyzeCommand } from "./commands/analyze.js";
import { registerGraphCommand } from "./commands/graph.js";
import { registerImpactCommand } from "./commands/impact.js";
import { registerDeadcodeCommand } from "./commands/deadcode.js";
import { registerDashboardCommand } from "./commands/dashboard.js";

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
  .version("3.0.0");

registerAnalyzeCommand(program);
registerGraphCommand(program);
registerImpactCommand(program);
registerDeadcodeCommand(program);
registerDashboardCommand(program);

program.parse(process.argv);
