import fs from "node:fs";
import path from "node:path";

export interface PluginConfigSetting {
  id: string;
  enabled?: boolean;
  priority?: number; // Higher number = higher priority for matching files
  options?: Record<string, unknown>;
}

export interface CascadeConfig {
  entryPoints: string[];
  ignore: string[];
  extensions: string[];
  plugins: PluginConfigSetting[];
  pathAliases?: Record<string, string>;
  maxDepth?: number;
}

export const defaultConfig: CascadeConfig = {
  entryPoints: [
    "src/index.ts",
    "src/index.tsx",
    "src/index.js",
    "src/index.jsx",
    "src/main.ts",
    "src/main.js",
    "index.ts",
    "index.js",
  ],
  ignore: ["**/node_modules/**", "**/dist/**", "**/build/**", "**/.git/**", "**/coverage/**"],
  extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  plugins: [
    { id: "cascade-language-typescript", enabled: true, priority: 100 },
    { id: "cascade-language-javascript", enabled: true, priority: 50 },
  ],
  pathAliases: {},
};

export function loadCascadeConfig(projectRoot: string): CascadeConfig {
  const configPath = path.join(projectRoot, "cascade.config.json");
  if (!fs.existsSync(configPath)) {
    return { ...defaultConfig };
  }

  try {
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<CascadeConfig>;

    return {
      entryPoints: Array.isArray(parsed.entryPoints)
        ? parsed.entryPoints
        : defaultConfig.entryPoints,
      ignore: Array.isArray(parsed.ignore) ? parsed.ignore : defaultConfig.ignore,
      extensions: Array.isArray(parsed.extensions) ? parsed.extensions : defaultConfig.extensions,
      plugins: Array.isArray(parsed.plugins)
        ? parsed.plugins.map((p) => ({
            id: p.id,
            enabled: p.enabled !== false,
            priority: typeof p.priority === "number" ? p.priority : 50,
            options: p.options || {},
          }))
        : defaultConfig.plugins,
      pathAliases: parsed.pathAliases || defaultConfig.pathAliases,
      maxDepth: parsed.maxDepth,
    };
  } catch (err) {
    throw new Error(
      `Failed to load cascade.config.json at ${configPath}: ${(err as Error).message}`
    );
  }
}
