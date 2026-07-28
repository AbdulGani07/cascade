import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import JavaScript from "tree-sitter-javascript";
import {
  LanguagePlugin,
  ParseContext,
  ParseResult,
  ExtractionContext,
  DependencyExtractionResult,
  ExtractedDependency,
  SymbolContext,
  SymbolExtractionResult,
  SymbolDeclaration,
  ResolutionContext,
  ResolvedModuleResult,
  EntryPointHint,
} from "@cascade/plugin-api";

export class JavaScriptLanguagePlugin implements LanguagePlugin {
  id = "cascade-language-javascript";
  name = "Cascade JavaScript Language Plugin";
  version = "1.0.0";
  supportedExtensions = [".js", ".jsx", ".mjs", ".cjs"];

  fileDetectionRules = [
    { type: "extension" as const, pattern: ".js" },
    { type: "extension" as const, pattern: ".jsx" },
    { type: "extension" as const, pattern: ".mjs" },
    { type: "extension" as const, pattern: ".cjs" },
    { type: "shebang" as const, pattern: "#!/usr/bin/env node" },
  ];

  capabilities = {
    astParsing: true,
    symbolExtraction: true,
    dynamicDependencies: true,
    reExports: true,
    typeOnlyDependencies: false,
    moduleResolution: true,
    entryPointDetection: true,
    testFileDetection: true,
    generatedFileDetection: true,
    crossLanguageEdges: true,
  };

  limitations = {
    knownIssues: [
      "Dynamic string interpolation inside import() or require() is extracted as unresolved runtime dependency",
    ],
    unsupportedFeatures: ["Type annotations (handled by TypeScript plugin)"],
  };

  parser = {
    parse(context: ParseContext): ParseResult {
      try {
        const parser = new Parser();
        parser.setLanguage(JavaScript as unknown as Parser.Language);
        const tree = parser.parse(context.content);
        return {
          ast: tree,
          status: "success",
          diagnostics: [],
        };
      } catch (err) {
        return {
          status: "partial",
          diagnostics: [
            {
              file: context.relativePath,
              message: `JavaScript AST parse warning: ${(err as Error).message}`,
              severity: "warning",
            },
          ],
        };
      }
    },
  };

  dependencyExtractor = {
    extractDependencies(context: ExtractionContext): DependencyExtractionResult {
      const deps: ExtractedDependency[] = [];
      const diagnostics: DependencyExtractionResult["diagnostics"] = [];

      // Try tree-sitter AST extraction first if tree is present
      if (context.ast) {
        try {
          const tree = context.ast as Parser.Tree;
          const querySource = `
            (import_statement source: (string) @import)
            (call_expression function: (import) arguments: (arguments (string) @dynamic))
            (call_expression function: (identifier) @req (#eq? @req "require") arguments: (arguments (string) @require))
            (export_statement source: (string) @reexport)
          `;
          const query = new Parser.Query(JavaScript as unknown as Parser.Language, querySource);
          const matches = query.matches(tree.rootNode);

          for (const match of matches) {
            for (const capture of match.captures) {
              const specifier = capture.node.text.replace(/['"]/g, "");
              const isDynamic = capture.name === "dynamic" || capture.name === "require";
              const isReExport = capture.name === "reexport";

              deps.push({
                specifier,
                importKind: isReExport ? "re-export" : isDynamic ? "dynamic" : "static",
                isStatic: !isDynamic && !isReExport,
                isDynamic,
                isTypeOnly: false,
                isReExport,
                isConditional: false,
                rawText: capture.node.text,
              });
            }
          }
        } catch {
          // Tree query failed; fall through to regex parser
        }
      }

      if (deps.length === 0) {
        // Regex fallback parser
        const importRegex =
          /(?:import\s+(?:[\s\S]*?\s+from\s+)?|import\(|require\()\s*['"]([^'"]+)['"]/g;
        let match: RegExpExecArray | null;
        while ((match = importRegex.exec(context.content)) !== null) {
          const isDynamic = match[0].includes("import(") || match[0].includes("require(");
          deps.push({
            specifier: match[1],
            importKind: isDynamic ? "dynamic" : "static",
            isStatic: !isDynamic,
            isDynamic,
            isTypeOnly: false,
            isReExport: false,
            isConditional: false,
            rawText: match[0],
          });
        }

        const exportRegex = /export\s+[\s\S]*?\s+from\s+['"]([^'"]+)['"]/g;
        while ((match = exportRegex.exec(context.content)) !== null) {
          deps.push({
            specifier: match[1],
            importKind: "re-export",
            isStatic: false,
            isDynamic: false,
            isTypeOnly: false,
            isReExport: true,
            isConditional: false,
            rawText: match[0],
          });
        }
      }

      return { dependencies: deps, diagnostics };
    },
  };

  symbolExtractor = {
    extractSymbols(context: SymbolContext): SymbolExtractionResult {
      const declarations: SymbolDeclaration[] = [];
      const funcRegex = /function\s+([a-zA-Z0-9_$]+)/g;
      let match: RegExpExecArray | null;
      while ((match = funcRegex.exec(context.content)) !== null) {
        declarations.push({
          id: `${context.relativePath}#${match[1]}`,
          name: match[1],
          kind: "function",
          exported: false,
        });
      }

      const classRegex = /class\s+([a-zA-Z0-9_$]+)/g;
      while ((match = classRegex.exec(context.content)) !== null) {
        declarations.push({
          id: `${context.relativePath}#${match[1]}`,
          name: match[1],
          kind: "class",
          exported: false,
        });
      }

      return { declarations, references: [], diagnostics: [] };
    },
  };

  moduleResolver = {
    resolveModule(context: ResolutionContext): ResolvedModuleResult {
      const { specifier, importerFilePath, projectRoot, allKnownFiles } = context;

      // Handle relative imports
      if (specifier.startsWith(".")) {
        const dir = path.dirname(importerFilePath);
        const resolvedAbs = path.resolve(dir, specifier);

        const candidates = [
          resolvedAbs,
          `${resolvedAbs}.js`,
          `${resolvedAbs}.jsx`,
          `${resolvedAbs}.mjs`,
          `${resolvedAbs}.cjs`,
          `${resolvedAbs}.ts`,
          `${resolvedAbs}.tsx`,
          path.join(resolvedAbs, "index.js"),
          path.join(resolvedAbs, "index.jsx"),
          path.join(resolvedAbs, "index.ts"),
          path.join(resolvedAbs, "index.tsx"),
        ];

        for (const candidate of candidates) {
          const posixCandidate = candidate.replace(/\\/g, "/");
          const posixRel = path
            .relative(projectRoot, posixCandidate)
            .replace(/\\/g, "/")
            .replace(/^\.\//, "");

          if (allKnownFiles.includes(posixRel) || fs.existsSync(candidate)) {
            return {
              resolvedFilePath: candidate,
              resolvedRelativePath: posixRel,
              resolutionStatus: "resolved",
              confidence: 1.0,
              resolverId: "javascript-relative-resolver",
            };
          }
        }
      }

      return {
        resolutionStatus: "external",
        confidence: 0.8,
        resolverId: "javascript-external-resolver",
      };
    },
  };

  entryPointHints = {
    detectEntryPoints(_projectRoot: string, files: string[]): EntryPointHint[] {
      const candidates = ["src/index.js", "src/main.js", "src/app.js", "index.js", "main.js"];
      const hints: EntryPointHint[] = [];

      for (const c of candidates) {
        if (files.includes(c)) {
          hints.push({
            filePath: c,
            relativePath: c,
            reason: "Standard JavaScript entry point naming convention",
            confidence: 0.9,
          });
        }
      }
      return hints;
    },
  };

  testFileDetector = {
    isTestFile(_filePath: string, relativePath: string): boolean {
      const normalized = relativePath.replace(/\\/g, "/").toLowerCase();
      return (
        normalized.includes(".test.") ||
        normalized.includes(".spec.") ||
        normalized.includes("__tests__/") ||
        normalized.startsWith("test/") ||
        normalized.startsWith("tests/")
      );
    },
  };

  generatedFileDetector = {
    isGeneratedFile(_filePath: string, relativePath: string, content?: string): boolean {
      const normalized = relativePath.toLowerCase();
      if (normalized.endsWith(".min.js") || normalized.endsWith(".bundle.js")) return true;
      if (content && (content.includes("@generated") || content.includes("auto-generated")))
        return true;
      return false;
    },
  };

  configFileDetector = {
    isConfigFile(_filePath: string, relativePath: string): boolean {
      const name = path.basename(relativePath).toLowerCase();
      return (
        name === "package.json" ||
        name.startsWith(".eslintrc") ||
        name.startsWith("babel.config") ||
        name.startsWith("webpack.config")
      );
    },
  };
}

export const createJavaScriptPlugin = () => new JavaScriptLanguagePlugin();
