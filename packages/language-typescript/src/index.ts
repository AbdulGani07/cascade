import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import TypeScript from "tree-sitter-typescript";
import {
  LanguagePlugin,
  ParseContext,
  ParseResult,
  ExtractionContext,
  DependencyExtractionResult,
  SymbolContext,
  SymbolExtractionResult,
  SymbolDeclaration,
  ResolutionContext,
  ResolvedModuleResult,
  EntryPointHint,
} from "@cascade/plugin-api";
import { extractScriptDependencies } from "@cascade/language-javascript";

export class TypeScriptLanguagePlugin implements LanguagePlugin {
  id = "cascade-language-typescript";
  name = "Cascade TypeScript Language Plugin";
  version = "3.1.0";
  supportedExtensions = [".ts", ".tsx", ".mts", ".cts"];

  fileDetectionRules = [
    { type: "extension" as const, pattern: ".ts" },
    { type: "extension" as const, pattern: ".tsx" },
    { type: "extension" as const, pattern: ".mts" },
    { type: "extension" as const, pattern: ".cts" },
  ];

  capabilities = {
    astParsing: true,
    symbolExtraction: true,
    dynamicDependencies: true,
    reExports: true,
    typeOnlyDependencies: true,
    moduleResolution: true,
    entryPointDetection: true,
    testFileDetection: true,
    generatedFileDetection: true,
    crossLanguageEdges: true,
  };

  limitations = {
    knownIssues: ["Type-only re-exports require TS compiler options context"],
    unsupportedFeatures: ["Macro expansion"],
  };
  analysisLevels = [
    "file-dependency",
    "module-dependency",
    "symbol-dependency",
    "build-dependency",
    "runtime-dynamic-dependency",
  ] as const;

  parser = {
    parse(context: ParseContext): ParseResult {
      try {
        const parser = new Parser();
        const lang = context.filePath.endsWith(".tsx") ? TypeScript.tsx : TypeScript.typescript;
        parser.setLanguage(lang as unknown as Parser.Language);
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
              message: `TypeScript AST parse warning: ${(err as Error).message}`,
              severity: "warning",
            },
          ],
        };
      }
    },
  };

  dependencyExtractor = {
    extractDependencies(context: ExtractionContext): DependencyExtractionResult {
      return extractScriptDependencies(context.filePath, context.relativePath, context.content);
    },
  };

  symbolExtractor = {
    extractSymbols(context: SymbolContext): SymbolExtractionResult {
      const declarations: SymbolDeclaration[] = [];

      const interfaceRegex = /interface\s+([a-zA-Z0-9_$]+)/g;
      let match: RegExpExecArray | null;
      while ((match = interfaceRegex.exec(context.content)) !== null) {
        declarations.push({
          id: `${context.relativePath}#${match[1]}`,
          name: match[1],
          kind: "interface",
          exported: false,
        });
      }

      const typeRegex = /type\s+([a-zA-Z0-9_$]+)\s*=/g;
      while ((match = typeRegex.exec(context.content)) !== null) {
        declarations.push({
          id: `${context.relativePath}#${match[1]}`,
          name: match[1],
          kind: "type",
          exported: false,
        });
      }

      const enumRegex = /enum\s+([a-zA-Z0-9_$]+)/g;
      while ((match = enumRegex.exec(context.content)) !== null) {
        declarations.push({
          id: `${context.relativePath}#${match[1]}`,
          name: match[1],
          kind: "enum",
          exported: false,
        });
      }

      const funcRegex = /function\s+([a-zA-Z0-9_$]+)/g;
      while ((match = funcRegex.exec(context.content)) !== null) {
        declarations.push({
          id: `${context.relativePath}#${match[1]}`,
          name: match[1],
          kind: "function",
          exported: false,
        });
      }

      return { declarations, references: [], diagnostics: [] };
    },
  };

  moduleResolver = {
    resolveModule(context: ResolutionContext): ResolvedModuleResult {
      const { specifier, importerFilePath, projectRoot, allKnownFiles } = context;

      if (specifier.startsWith(".")) {
        const dir = path.dirname(importerFilePath);
        const resolvedAbs = path.resolve(dir, specifier);

        const candidates = [
          resolvedAbs,
          `${resolvedAbs}.ts`,
          `${resolvedAbs}.tsx`,
          `${resolvedAbs}.mts`,
          `${resolvedAbs}.cts`,
          `${resolvedAbs}.js`,
          `${resolvedAbs}.jsx`,
          path.join(resolvedAbs, "index.ts"),
          path.join(resolvedAbs, "index.tsx"),
          path.join(resolvedAbs, "index.js"),
          path.join(resolvedAbs, "index.jsx"),
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
              resolverId: "typescript-relative-resolver",
            };
          }
        }
      }

      return {
        resolutionStatus: "external",
        confidence: 0.8,
        resolverId: "typescript-external-resolver",
      };
    },
  };

  entryPointHints = {
    detectEntryPoints(_projectRoot: string, files: string[]): EntryPointHint[] {
      const candidates = [
        "src/index.ts",
        "src/index.tsx",
        "src/main.ts",
        "src/app.ts",
        "index.ts",
        "index.tsx",
      ];
      const hints: EntryPointHint[] = [];

      for (const c of candidates) {
        if (files.includes(c)) {
          hints.push({
            filePath: c,
            relativePath: c,
            reason: "Standard TypeScript entry point naming convention",
            confidence: 0.95,
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
      if (
        normalized.endsWith(".d.ts") ||
        normalized.endsWith(".d.mts") ||
        normalized.endsWith(".d.cts") ||
        normalized.endsWith(".js.map")
      )
        return true;
      if (content && (content.includes("@generated") || content.includes("auto-generated")))
        return true;
      return false;
    },
  };

  configFileDetector = {
    isConfigFile(_filePath: string, relativePath: string): boolean {
      const name = path.basename(relativePath).toLowerCase();
      return name.startsWith("tsconfig") && name.endsWith(".json");
    },
  };
}

export const createTypeScriptPlugin = () => new TypeScriptLanguagePlugin();
