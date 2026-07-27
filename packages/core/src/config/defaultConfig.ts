import { ResolvedConfig } from "../types/index.js";

/**
 * Fallback configuration merged with any user-provided cascade.config.json.
 */
export const defaultConfig: ResolvedConfig = {
  entryPoints: ["src/index.ts", "src/index.js", "index.ts", "index.js"],
  ignore: [
    "node_modules/**",
    "dist/**",
    "build/**",
    "**/*.test.ts",
    "**/*.test.js",
    "**/*.spec.ts",
  ],
  extensions: [".ts", ".tsx", ".js", ".jsx"],
};
