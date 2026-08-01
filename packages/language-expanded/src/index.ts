import path from "node:path";
import type {
  DependencyExtractionResult,
  ExtractedDependency,
  FrameworkMetadata,
  LanguagePlugin,
  ParseContext,
  ParseDiagnostic,
  ParseResult,
  ResolutionContext,
  ResolvedModuleResult,
  SourceLocation,
} from "@cascade-code/plugin-api";

type TokenKind = "word" | "string" | "symbol" | "comment";
interface Token {
  kind: TokenKind;
  value: string;
  line: number;
  column: number;
}
interface StructuredDocument {
  type: "cascade-token-tree";
  tokens: Token[];
  diagnostics: ParseDiagnostic[];
}
type LanguageKey =
  | "php"
  | "ruby"
  | "swift"
  | "dart"
  | "shell"
  | "powershell"
  | "lua"
  | "r"
  | "vue"
  | "svelte"
  | "html"
  | "styles"
  | "graphql"
  | "sql";
interface Spec {
  key: LanguageKey;
  name: string;
  extensions: string[];
  analysisLevels: LanguagePlugin["analysisLevels"];
  manifests: string[];
  limitations: string[];
}

function normalize(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function tokenize(context: ParseContext): StructuredDocument {
  const tokens: Token[] = [];
  const diagnostics: ParseDiagnostic[] = [];
  const source = context.content;
  let index = 0;
  let line = 1;
  let column = 1;
  const advance = (text: string) => {
    for (const char of text) {
      if (char === "\n") {
        line++;
        column = 1;
      } else column++;
    }
    index += text.length;
  };
  while (index < source.length) {
    const startLine = line;
    const startColumn = column;
    const char = source[index];
    if (/\s/.test(char)) {
      advance(char);
      continue;
    }
    if (
      (char === "/" && source[index + 1] === "/") ||
      char === "#" ||
      (char === "-" && source[index + 1] === "-")
    ) {
      const end = source.indexOf("\n", index);
      const text = source.slice(index, end < 0 ? source.length : end);
      tokens.push({ kind: "comment", value: text, line, column });
      advance(text);
      continue;
    }
    if (char === "/" && source[index + 1] === "*") {
      const end = source.indexOf("*/", index + 2);
      const text = source.slice(index, end < 0 ? source.length : end + 2);
      tokens.push({ kind: "comment", value: text, line, column });
      if (end < 0)
        diagnostics.push({
          file: context.relativePath,
          message: "Unterminated block comment.",
          severity: "error",
          code: "STRUCTURED_UNTERMINATED_COMMENT",
          location: { startLine, startColumn, endLine: line, endColumn: column },
        });
      advance(text);
      continue;
    }
    if (char === "'" || char === '"' || char === "`") {
      const quote = char;
      let cursor = index + 1;
      let escaped = false;
      while (cursor < source.length) {
        if (!escaped && source[cursor] === quote) {
          cursor++;
          break;
        }
        escaped = !escaped && source[cursor] === "\\";
        if (source[cursor] !== "\\") escaped = false;
        cursor++;
      }
      const text = source.slice(index, cursor);
      if (!text.endsWith(quote))
        diagnostics.push({
          file: context.relativePath,
          message: "Unterminated string literal.",
          severity: "error",
          code: "STRUCTURED_UNTERMINATED_STRING",
          location: { startLine, startColumn, endLine: line, endColumn: column },
        });
      tokens.push({
        kind: "string",
        value: text.slice(1, text.endsWith(quote) ? -1 : undefined),
        line,
        column,
      });
      advance(text);
      continue;
    }
    const word = /^[A-Za-z_$@][\w$@.-]*/.exec(source.slice(index))?.[0];
    if (word) {
      tokens.push({ kind: "word", value: word, line, column });
      advance(word);
      continue;
    }
    tokens.push({ kind: "symbol", value: char, line, column });
    advance(char);
  }
  return { type: "cascade-token-tree", tokens, diagnostics };
}

function location(token: Token): SourceLocation {
  return {
    startLine: token.line,
    startColumn: token.column,
    endLine: token.line,
    endColumn: token.column + token.value.length,
  };
}

function dependency(
  token: Token,
  specifier: string,
  options: Partial<ExtractedDependency> = {}
): ExtractedDependency {
  return {
    specifier,
    importKind: options.importKind ?? "static",
    isStatic: options.isStatic ?? true,
    isDynamic: options.isDynamic ?? false,
    isTypeOnly: options.isTypeOnly ?? false,
    isReExport: options.isReExport ?? false,
    isConditional: options.isConditional ?? false,
    sourceLocation: location(token),
    rawText: options.rawText,
    confidence: options.confidence ?? 0.95,
    evidence: options.evidence ?? ["structured token-tree dependency"],
  };
}

function nextValue(tokens: Token[], index: number): Token | undefined {
  return tokens
    .slice(index + 1)
    .find(
      (token) =>
        token.kind !== "comment" &&
        !(token.kind === "symbol" && ["(", "=", ":", ","].includes(token.value))
    );
}

function extract(
  spec: Spec,
  context: ParseContext & { ast?: unknown }
): DependencyExtractionResult {
  const document =
    (context.ast as StructuredDocument | undefined)?.type === "cascade-token-tree"
      ? (context.ast as StructuredDocument)
      : tokenize(context);
  const tokens = document.tokens;
  const dependencies: ExtractedDependency[] = [];
  const addNext = (index: number, evidence: string, options?: Partial<ExtractedDependency>) => {
    const target = nextValue(tokens, index);
    if (target?.kind === "string" || target?.kind === "word")
      dependencies.push(
        dependency(tokens[index], target.value, {
          ...options,
          evidence: [evidence],
        })
      );
  };
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (spec.key === "graphql" && token.kind === "comment") {
      const specifier = /^#import\s+["']([^"']+)["']/.exec(token.value)?.[1];
      if (specifier)
        dependencies.push(
          dependency(token, specifier, { evidence: ["GraphQL #import comment directive"] })
        );
    }
    if (token.kind === "comment") continue;
    const value = token.value.toLowerCase();
    if (
      spec.key === "php" &&
      ["require", "require_once", "include", "include_once"].includes(value)
    )
      addNext(index, `PHP ${value}`);
    if (spec.key === "php" && value === "use") addNext(index, "PHP namespace use");
    if (spec.key === "ruby" && ["require", "require_relative", "load"].includes(value))
      addNext(index, `Ruby ${value}`);
    if (spec.key === "swift" && value === "import") addNext(index, "Swift import declaration");
    if (spec.key === "dart" && ["import", "export", "part"].includes(value))
      addNext(index, `Dart ${value}`, { isReExport: value === "export" });
    if (spec.key === "shell" && (value === "source" || token.value === "."))
      addNext(index, "shell source command");
    if (spec.key === "powershell" && ["import-module", "using"].includes(value))
      addNext(index, `PowerShell ${value}`);
    if (spec.key === "lua" && (value === "require" || value === "dofile"))
      addNext(index, `Lua ${value}`);
    if (spec.key === "r" && ["library", "require", "source"].includes(value))
      addNext(index, `R ${value}`);
    if (["vue", "svelte"].includes(spec.key) && value === "from")
      addNext(index, `${spec.name} script import`);
    if (
      ["vue", "svelte"].includes(spec.key) &&
      value === "import" &&
      nextValue(tokens, index)?.kind === "string"
    )
      addNext(index, `${spec.name} side-effect import`);
    if (["html", "vue", "svelte"].includes(spec.key)) {
      if (["src", "href"].includes(value) && tokens[index + 1]?.value === "=")
        addNext(index + 1, `${spec.name} ${value} attribute`);
    }
    if (spec.key === "styles" && ["@import", "@use", "@forward"].includes(value))
      addNext(index, `stylesheet ${value}`);
    if (spec.key === "styles" && value === "url") addNext(index, "stylesheet url reference");
    if (spec.key === "sql" && ["references", "from", "join"].includes(value))
      addNext(index, `SQL ${value}`, { confidence: value === "references" ? 0.9 : 0.65 });
  }
  return { dependencies, diagnostics: [] };
}

function resolve(spec: Spec, context: ResolutionContext): ResolvedModuleResult {
  const requested = normalize(context.specifier);
  const importerDir = path.posix.dirname(normalize(context.importerRelativePath));
  const known = context.allKnownFiles.map(normalize);
  const candidates = new Set<string>();
  const bases = [normalize(path.posix.join(importerDir, requested)), requested];
  for (const base of bases) {
    if (known.includes(base)) candidates.add(base);
    for (const extension of spec.extensions) {
      if (known.includes(`${base}${extension}`)) candidates.add(`${base}${extension}`);
      if (known.includes(`${base}/index${extension}`)) candidates.add(`${base}/index${extension}`);
    }
  }
  if (candidates.size === 1) {
    const relative = [...candidates][0];
    return {
      resolvedFilePath: path.join(context.projectRoot, relative),
      resolvedRelativePath: relative,
      resolutionStatus: "resolved",
      dependencyCategory: "internal",
      confidence: 0.95,
      resolverId: `${spec.key}-structured-resolver`,
      evidence: ["existing importer-relative or repository path"],
    };
  }
  if (candidates.size > 1)
    return {
      resolutionStatus: "ambiguous",
      dependencyCategory: "unresolved",
      confidence: 0.4,
      resolverId: `${spec.key}-structured-resolver`,
      evidence: [...candidates].map((candidate) => `candidate '${candidate}'`),
      diagnostics: [
        {
          file: context.importerRelativePath,
          message: `${spec.name} dependency '${requested}' is ambiguous.`,
          severity: "warning",
          code: `${spec.key.toUpperCase()}_AMBIGUOUS`,
        },
      ],
    };
  const pathLike =
    requested.startsWith(".") || requested.startsWith("/") || requested.includes("/");
  if (!pathLike && !["html", "styles", "graphql", "sql"].includes(spec.key))
    return {
      resolutionStatus: "external",
      dependencyCategory: "external",
      confidence: 0.9,
      resolverId: `${spec.key}-structured-resolver`,
      evidence: ["bare module/package name without internal target"],
    };
  return {
    resolutionStatus: "unresolved",
    dependencyCategory: "unresolved",
    confidence: 0.9,
    resolverId: `${spec.key}-structured-resolver`,
    evidence: ["no existing repository target"],
    diagnostics: [
      {
        file: context.importerRelativePath,
        message: `${spec.name} dependency '${requested}' could not be resolved.`,
        severity: "warning",
        code: `${spec.key.toUpperCase()}_UNRESOLVED`,
      },
    ],
  };
}

function metadata(spec: Spec, root: string, files: string[]): FrameworkMetadata[] {
  const normalized = files.map(normalize);
  return spec.manifests
    .filter((manifest) => normalized.some((file) => path.posix.basename(file) === manifest))
    .map((manifest) => ({
      frameworkName: manifest,
      metadata: { buildSystem: manifest, language: spec.name, root },
    }));
}

const specs: Record<LanguageKey, Spec> = {
  php: {
    key: "php",
    name: "PHP",
    extensions: [".php"],
    analysisLevels: [
      "file-dependency",
      "module-dependency",
      "build-dependency",
      "runtime-dynamic-dependency",
    ],
    manifests: ["composer.json"],
    limitations: [
      "Composer autoload rules are detected but Composer is not executed.",
      "Dynamic PHP includes are diagnostic-only.",
    ],
  },
  ruby: {
    key: "ruby",
    name: "Ruby",
    extensions: [".rb", ".rake", ".gemspec"],
    analysisLevels: [
      "file-dependency",
      "module-dependency",
      "build-dependency",
      "runtime-dynamic-dependency",
    ],
    manifests: ["Gemfile", "Rakefile"],
    limitations: [
      "Ruby metaprogramming and autoload hooks are not executed.",
      "Bundler and Rails conventions provide evidence, not complete runtime resolution.",
    ],
  },
  swift: {
    key: "swift",
    name: "Swift",
    extensions: [".swift"],
    analysisLevels: ["module-dependency", "build-dependency"],
    manifests: ["Package.swift"],
    limitations: [
      "Swift compiler type checking and Xcode project evaluation are not performed.",
      "Conditional compilation is preserved without target evaluation.",
    ],
  },
  dart: {
    key: "dart",
    name: "Dart",
    extensions: [".dart"],
    analysisLevels: ["file-dependency", "module-dependency", "build-dependency"],
    manifests: ["pubspec.yaml"],
    limitations: [
      "Generated build_runner output is excluded.",
      "Package resolution is conservative without running pub.",
    ],
  },
  shell: {
    key: "shell",
    name: "Shell",
    extensions: [".sh", ".bash", ".zsh", ".ksh"],
    analysisLevels: ["file-dependency", "runtime-dynamic-dependency"],
    manifests: [],
    limitations: [
      "Variable-expanded source paths and eval cannot be resolved.",
      "Shell dialect semantics are file-dependency level.",
    ],
  },
  powershell: {
    key: "powershell",
    name: "PowerShell",
    extensions: [".ps1", ".psm1", ".psd1"],
    analysisLevels: ["file-dependency", "module-dependency", "runtime-dynamic-dependency"],
    manifests: [],
    limitations: [
      "Dynamic module names and invocation operators are diagnostic-only.",
      "PowerShell runtime/provider semantics are not executed.",
    ],
  },
  lua: {
    key: "lua",
    name: "Lua",
    extensions: [".lua"],
    analysisLevels: ["file-dependency", "module-dependency", "runtime-dynamic-dependency"],
    manifests: [".luacheckrc"],
    limitations: ["package.path mutations and dynamic require expressions are not evaluated."],
  },
  r: {
    key: "r",
    name: "R",
    extensions: [".r", ".R"],
    analysisLevels: [
      "file-dependency",
      "module-dependency",
      "build-dependency",
      "runtime-dynamic-dependency",
    ],
    manifests: ["DESCRIPTION", "renv.lock"],
    limitations: [
      "Non-standard evaluation and dynamic source paths are not executed.",
      "R package namespace semantics are partial.",
    ],
  },
  vue: {
    key: "vue",
    name: "Vue",
    extensions: [".vue"],
    analysisLevels: ["file-dependency", "module-dependency"],
    manifests: ["nuxt.config.ts", "vite.config.ts"],
    limitations: [
      "Template expressions are token-structured but not Vue compiler semantic bindings.",
      "Macros and generated virtual modules are not expanded.",
    ],
  },
  svelte: {
    key: "svelte",
    name: "Svelte",
    extensions: [".svelte"],
    analysisLevels: ["file-dependency", "module-dependency"],
    manifests: ["svelte.config.js", "vite.config.ts"],
    limitations: ["Svelte compiler transformations and generated routes are not executed."],
  },
  html: {
    key: "html",
    name: "HTML",
    extensions: [".html", ".htm"],
    analysisLevels: ["file-dependency"],
    manifests: [],
    limitations: [
      "Inline JavaScript semantics are delegated to language plugins only when represented as separate files.",
    ],
  },
  styles: {
    key: "styles",
    name: "Stylesheet",
    extensions: [".css", ".scss", ".sass", ".less"],
    analysisLevels: ["file-dependency"],
    manifests: [],
    limitations: ["Preprocessor variables, mixins, and computed URLs are not evaluated."],
  },
  graphql: {
    key: "graphql",
    name: "GraphQL",
    extensions: [".graphql", ".gql"],
    analysisLevels: ["file-dependency"],
    manifests: [],
    limitations: [
      "Schema validation and operation type checking require an external schema and are not claimed.",
    ],
  },
  sql: {
    key: "sql",
    name: "SQL",
    extensions: [".sql"],
    analysisLevels: ["file-dependency", "build-dependency"],
    manifests: [],
    limitations: [
      "SQL dialect semantics are partial.",
      "Table-name references do not invent source-file edges.",
      "Migration ordering is inferred only from explicit filename ordering.",
    ],
  },
};

function create(spec: Spec): LanguagePlugin {
  return {
    id: `cascade-language-${spec.key}`,
    name: `Cascade ${spec.name} Language Plugin`,
    version: "3.3.1",
    supportedExtensions: spec.extensions,
    fileDetectionRules: spec.extensions.map((pattern) => ({ type: "extension" as const, pattern })),
    analysisLevels: spec.analysisLevels,
    capabilities: {
      astParsing: true,
      symbolExtraction: spec.analysisLevels.includes("symbol-dependency"),
      dynamicDependencies: spec.analysisLevels.includes("runtime-dynamic-dependency"),
      reExports: ["dart", "graphql"].includes(spec.key),
      typeOnlyDependencies: false,
      moduleResolution: true,
      entryPointDetection: true,
      testFileDetection: true,
      generatedFileDetection: true,
      crossLanguageEdges: ["vue", "svelte", "html", "styles", "graphql", "sql"].includes(spec.key),
    },
    limitations: {
      knownIssues: spec.limitations,
      unsupportedFeatures: ["Full compiler or runtime semantic evaluation"],
    },
    parser: {
      parse(context) {
        const ast = tokenize(context);
        return {
          ast,
          diagnostics: ast.diagnostics,
          status: ast.diagnostics.length ? "partial" : "success",
        } satisfies ParseResult;
      },
    },
    dependencyExtractor: { extractDependencies: (context) => extract(spec, context) },
    moduleResolver: { resolveModule: (context) => resolve(spec, context) },
    entryPointHints: {
      detectEntryPoints(root, files) {
        return files
          .filter((file) =>
            /(?:^|\/)(?:main|index|app|server|manage|artisan|bin\/[^/]+)\.[^/]+$/i.test(
              normalize(file)
            )
          )
          .filter((file) => spec.extensions.includes(path.extname(file)))
          .map((relativePath) => ({
            filePath: path.join(root, relativePath),
            relativePath,
            reason: `${spec.name} conventional entry point`,
            confidence: 0.75,
          }));
      },
    },
    testFileDetector: {
      isTestFile: (_file, relative) =>
        /(?:^|\/)(?:test|tests|spec|specs|__tests__)\/|(?:_test|\.test|_spec|\.spec)\./i.test(
          normalize(relative)
        ),
    },
    generatedFileDetector: {
      isGeneratedFile(_file, relative, content) {
        return (
          /(?:^|\/)(?:vendor|Pods|DerivedData|\.dart_tool|build|dist|cache|\.bundle|coverage|generated|gen)\//i.test(
            normalize(relative)
          ) || /(?:generated|do not edit)/i.test((content ?? "").slice(0, 400))
        );
      },
    },
    configFileDetector: {
      isConfigFile: (_file, relative) =>
        spec.manifests.includes(path.posix.basename(normalize(relative))),
    },
    frameworkMetadata: { detectMetadata: (root, files) => metadata(spec, root, files) },
  };
}

export const createPhpPlugin = () => create(specs.php);
export const createRubyPlugin = () => create(specs.ruby);
export const createSwiftPlugin = () => create(specs.swift);
export const createDartPlugin = () => create(specs.dart);
export const createShellPlugin = () => create(specs.shell);
export const createPowerShellPlugin = () => create(specs.powershell);
export const createLuaPlugin = () => create(specs.lua);
export const createRPlugin = () => create(specs.r);
export const createVuePlugin = () => create(specs.vue);
export const createSveltePlugin = () => create(specs.svelte);
export const createHtmlPlugin = () => create(specs.html);
export const createStylesPlugin = () => create(specs.styles);
export const createGraphqlPlugin = () => create(specs.graphql);
export const createSqlPlugin = () => create(specs.sql);
