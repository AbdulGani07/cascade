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
  assetExtensions?: string[];
  includeNonCodeEdges?: boolean;
  respectGitignore?: boolean;
  caseSensitiveResolution?: boolean;
  conditions?: string[];
  maxDepth?: number;
  pythonSourceRoots?: string[];
  analyzeNotebooks?: boolean;
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
  ignore: [
    "**/node_modules/**",
    "**/dist/**",
    "**/build/**",
    "**/.git/**",
    "**/coverage/**",
    "**/.venv/**",
    "**/venv/**",
    "**/__pycache__/**",
    "**/.tox/**",
    "**/.nox/**",
    "**/.mypy_cache/**",
    "**/.pytest_cache/**",
    "**/.ruff_cache/**",
    "**/site-packages/**",
    "**/target/**",
    "**/.gradle/**",
    "**/generated/**",
    "**/generated-sources/**",
    "**/bin/**",
    "**/obj/**",
  ],
  extensions: [
    ".ts",
    ".tsx",
    ".mts",
    ".cts",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".pyi",
    ".java",
    ".kt",
    ".kts",
    ".cs",
    ".go",
  ],
  plugins: [
    { id: "cascade-language-typescript", enabled: true, priority: 100 },
    { id: "cascade-language-javascript", enabled: true, priority: 50 },
    { id: "cascade-language-python", enabled: true, priority: 80 },
    { id: "cascade-language-java", enabled: true, priority: 75 },
    { id: "cascade-language-kotlin", enabled: true, priority: 75 },
    { id: "cascade-language-csharp", enabled: true, priority: 75 },
    { id: "cascade-language-go", enabled: true, priority: 75 },
  ],
  pathAliases: {},
  assetExtensions: [
    ".json",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".svg",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".wasm",
  ],
  includeNonCodeEdges: true,
  respectGitignore: true,
  conditions: ["types", "import", "require", "node", "browser", "default"],
  pythonSourceRoots: ["src"],
  analyzeNotebooks: false,
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
      assetExtensions: Array.isArray(parsed.assetExtensions)
        ? parsed.assetExtensions
        : defaultConfig.assetExtensions,
      includeNonCodeEdges:
        typeof parsed.includeNonCodeEdges === "boolean"
          ? parsed.includeNonCodeEdges
          : defaultConfig.includeNonCodeEdges,
      respectGitignore:
        typeof parsed.respectGitignore === "boolean"
          ? parsed.respectGitignore
          : defaultConfig.respectGitignore,
      caseSensitiveResolution: parsed.caseSensitiveResolution,
      conditions: Array.isArray(parsed.conditions) ? parsed.conditions : defaultConfig.conditions,
      maxDepth: parsed.maxDepth,
      pythonSourceRoots: Array.isArray(parsed.pythonSourceRoots)
        ? parsed.pythonSourceRoots
        : defaultConfig.pythonSourceRoots,
      analyzeNotebooks: parsed.analyzeNotebooks === true,
    };
  } catch (err) {
    throw new Error(
      `Failed to load cascade.config.json at ${configPath}: ${(err as Error).message}`
    );
  }
}
