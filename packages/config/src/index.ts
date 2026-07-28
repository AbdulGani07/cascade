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
  /** Analyze only these project/workspace IDs; omitted means the complete repository. */
  selectedProjects?: string[];
  /** Deterministic local corrections for unusual repository layouts. */
  projectOverrides?: Record<string, { name?: string; projectType?: string; ignore?: boolean }>;
  gitImpact?: {
    riskWeights?: Partial<
      Record<
        | "changedFiles"
        | "directDependents"
        | "transitiveDependents"
        | "entryPoints"
        | "publicSymbols"
        | "tests"
        | "services"
        | "introducedCycles"
        | "architectureViolations"
        | "unresolvedDependencies"
        | "ownershipBoundaries"
        | "criticalPath",
        number
      >
    >;
    testMappings?: Record<string, string[]>;
    coverageMap?: Record<string, string[]>;
    criticalPaths?: string[];
    architectureRules?: Array<{ id: string; from: string; to: string }>;
  };
  architectureGovernance?: {
    version: "1";
    rules: import("@cascade/plugin-api").ArchitectureRule[];
    suppressions?: import("@cascade/plugin-api").ArchitectureSuppression[];
  };
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
    "**/.cargo/**",
    "**/cmake-build-*/**",
    "**/CMakeFiles/**",
    "**/bazel-out/**",
    "**/bazel-bin/**",
    "**/vendor/**",
    "**/.bundle/**",
    "**/Pods/**",
    "**/DerivedData/**",
    "**/.dart_tool/**",
    "**/.Rproj.user/**",
    "**/renv/library/**",
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
    ".rs",
    ".c",
    ".h",
    ".cc",
    ".cpp",
    ".cxx",
    ".hh",
    ".hpp",
    ".hxx",
    ".php",
    ".rb",
    ".rake",
    ".gemspec",
    ".swift",
    ".dart",
    ".sh",
    ".bash",
    ".zsh",
    ".ksh",
    ".ps1",
    ".psm1",
    ".psd1",
    ".lua",
    ".r",
    ".R",
    ".vue",
    ".svelte",
    ".html",
    ".htm",
    ".css",
    ".scss",
    ".sass",
    ".less",
    ".graphql",
    ".gql",
    ".sql",
  ],
  plugins: [
    { id: "cascade-language-typescript", enabled: true, priority: 100 },
    { id: "cascade-language-javascript", enabled: true, priority: 50 },
    { id: "cascade-language-python", enabled: true, priority: 80 },
    { id: "cascade-language-java", enabled: true, priority: 75 },
    { id: "cascade-language-kotlin", enabled: true, priority: 75 },
    { id: "cascade-language-csharp", enabled: true, priority: 75 },
    { id: "cascade-language-go", enabled: true, priority: 75 },
    { id: "cascade-language-rust", enabled: true, priority: 75 },
    { id: "cascade-language-cpp", enabled: true, priority: 72 },
    { id: "cascade-language-c", enabled: true, priority: 70 },
    { id: "cascade-language-php", enabled: true, priority: 75 },
    { id: "cascade-language-ruby", enabled: true, priority: 75 },
    { id: "cascade-language-swift", enabled: true, priority: 75 },
    { id: "cascade-language-dart", enabled: true, priority: 75 },
    { id: "cascade-language-shell", enabled: true, priority: 75 },
    { id: "cascade-language-powershell", enabled: true, priority: 75 },
    { id: "cascade-language-lua", enabled: true, priority: 75 },
    { id: "cascade-language-r", enabled: true, priority: 75 },
    { id: "cascade-language-vue", enabled: true, priority: 90 },
    { id: "cascade-language-svelte", enabled: true, priority: 90 },
    { id: "cascade-language-html", enabled: true, priority: 60 },
    { id: "cascade-language-styles", enabled: true, priority: 60 },
    { id: "cascade-language-graphql", enabled: true, priority: 65 },
    { id: "cascade-language-sql", enabled: false, priority: 40 },
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
  selectedProjects: [],
  projectOverrides: {},
  gitImpact: {
    riskWeights: {},
    testMappings: {},
    coverageMap: {},
    criticalPaths: [],
    architectureRules: [],
  },
  architectureGovernance: { version: "1", rules: [], suppressions: [] },
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
      selectedProjects: Array.isArray(parsed.selectedProjects)
        ? parsed.selectedProjects.filter((item): item is string => typeof item === "string")
        : defaultConfig.selectedProjects,
      projectOverrides:
        parsed.projectOverrides && typeof parsed.projectOverrides === "object"
          ? parsed.projectOverrides
          : defaultConfig.projectOverrides,
      gitImpact:
        parsed.gitImpact && typeof parsed.gitImpact === "object"
          ? parsed.gitImpact
          : defaultConfig.gitImpact,
      architectureGovernance: validateGovernance(parsed.architectureGovernance),
    };
  } catch (err) {
    throw new Error(
      `Failed to load cascade.config.json at ${configPath}: ${(err as Error).message}`
    );
  }
}

function validateGovernance(value: unknown): CascadeConfig["architectureGovernance"] {
  if (!value) return defaultConfig.architectureGovernance;
  if (
    !value ||
    typeof value !== "object" ||
    (value as { version?: unknown }).version !== "1" ||
    !Array.isArray((value as { rules?: unknown }).rules)
  )
    throw new Error("architectureGovernance must use version '1' and contain a rules array.");
  const rules = (value as { rules: unknown[] }).rules;
  for (const rule of rules)
    if (!rule || typeof rule !== "object" || typeof (rule as { id?: unknown }).id !== "string")
      throw new Error("Each architectureGovernance rule requires a string id.");
  return value as NonNullable<CascadeConfig["architectureGovernance"]>;
}
