import { readFileSync, existsSync } from "node:fs";
import * as path from "node:path";
import { ResolvedConfig, CascadeError } from "../types/index.js";
import { defaultConfig } from "./defaultConfig.js";

/**
 * Loads and validates the cascade.config.json from the project root.
 * Merges it with default settings if the file exists.
 */
export function loadConfig(projectRoot: string): ResolvedConfig {
  const configPath = path.join(projectRoot, "cascade.config.json");

  if (!existsSync(configPath)) {
    return { ...defaultConfig };
  }

  let userConfig: any;
  try {
    const fileContent = readFileSync(configPath, "utf-8");
    userConfig = JSON.parse(fileContent);
  } catch (error) {
    throw new CascadeError("CONFIG_ERROR", `Failed to parse config file at ${configPath}`, configPath);
  }

  const mergedConfig: ResolvedConfig = { ...defaultConfig };

  const fields: (keyof ResolvedConfig)[] = ["entryPoints", "ignore", "extensions"];

  for (const field of fields) {
    if (userConfig[field] !== undefined) {
      if (!Array.isArray(userConfig[field]) || !userConfig[field].every((item: any) => typeof item === "string")) {
        throw new CascadeError("CONFIG_ERROR", `Invalid field "${String(field)}": must be an array of strings.`);
      }
      mergedConfig[field] = userConfig[field];
    }
  }

  return mergedConfig;
}