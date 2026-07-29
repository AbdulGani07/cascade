import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import C from "tree-sitter-c";
import type {
  DependencyExtractionResult,
  EntryPointHint,
  ExtractionContext,
  LanguagePlugin,
  ParseContext,
  ParseDiagnostic,
  ParseResult,
  ResolutionContext,
  ResolvedModuleResult,
  SourceLocation,
  SymbolDeclaration,
  SymbolExtractionResult,
} from "@cascade-code/plugin-api";

type NativeTree = Parser.Tree;
type NativeNode = Parser.SyntaxNode;

function parserForC(): Parser {
  const parser = new Parser();
  parser.setLanguage(C as unknown as Parser.Language);
  return parser;
}

function location(node: NativeNode): SourceLocation {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
}

function walk(node: NativeNode, visit: (node: NativeNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function parse(context: ParseContext): ParseResult {
  try {
    const tree = parserForC().parse(context.content);
    const diagnostics: ParseDiagnostic[] = [];
    walk(tree.rootNode, (node) => {
      if (node.type !== "ERROR" && !node.isMissing) return;
      diagnostics.push({
        file: context.relativePath,
        message: node.isMissing
          ? `Missing ${node.type} in C syntax tree.`
          : `Invalid C syntax near '${node.text.slice(0, 80)}'.`,
        severity: "error",
        code: "C_PARSE_ERROR",
        location: location(node),
      });
    });
    return { ast: tree, status: diagnostics.length ? "partial" : "success", diagnostics };
  } catch (error) {
    return {
      status: "failed",
      diagnostics: [
        {
          file: context.relativePath,
          message: `C parser failed: ${(error as Error).message}`,
          severity: "error",
          code: "C_PARSER_FAILURE",
        },
      ],
    };
  }
}

export function extractCDependencies(
  relativePath: string,
  content: string,
  suppliedTree?: unknown
): DependencyExtractionResult {
  const tree =
    suppliedTree instanceof Object && "rootNode" in suppliedTree
      ? (suppliedTree as NativeTree)
      : parserForC().parse(content);
  const dependencies: DependencyExtractionResult["dependencies"] = [];
  walk(tree.rootNode, (node) => {
    if (node.type !== "preproc_include") return;
    const target =
      node.childForFieldName("path") ??
      node.namedChildren.find((child) =>
        ["string_literal", "system_lib_string"].includes(child.type)
      );
    if (!target) return;
    const raw = target.text;
    const system = raw.startsWith("<");
    const specifier = raw.replace(/^["<]|[">]$/g, "");
    dependencies.push({
      specifier,
      importKind: "reference",
      isStatic: true,
      isDynamic: false,
      isTypeOnly: false,
      isReExport: false,
      isConditional: node.parent?.type === "preproc_if" || node.parent?.type === "preproc_ifdef",
      sourceLocation: location(node),
      rawText: node.text,
      confidence: 1,
      evidence: [
        "Tree-sitter C preproc_include",
        system ? "angle-bracket system include" : "quoted local include",
      ],
    });
  });
  return { dependencies, diagnostics: [] };
}

function normalize(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

export function resolveNativeInclude(
  context: ResolutionContext,
  resolverId = "c-include-resolver",
  languageName = "C"
): ResolvedModuleResult {
  const specifier = normalize(context.specifier);
  const raw = context.extractedDependency.rawText ?? "";
  const system = /#\s*include\s*</.test(raw);
  if (system)
    return {
      resolutionStatus: "external",
      confidence: 0.98,
      resolverId,
      dependencyCategory: "standard-library",
      evidence: ["angle-bracket include; no repository-local target asserted"],
    };

  const importerDir = path.posix.dirname(normalize(context.importerRelativePath));
  const relativeCandidate = normalize(path.posix.join(importerDir, specifier));
  const known = new Map(context.allKnownFiles.map((file) => [normalize(file), file]));
  const direct = known.get(relativeCandidate);
  if (direct)
    return {
      resolvedFilePath: path.join(context.projectRoot, direct),
      resolvedRelativePath: direct,
      resolutionStatus: "resolved",
      confidence: 1,
      resolverId,
      dependencyCategory: "internal",
      evidence: ["quoted include resolved relative to importer"],
    };

  const suffixMatches = [...known.entries()].filter(
    ([normalized]) => normalized === specifier || normalized.endsWith(`/${specifier}`)
  );
  if (suffixMatches.length === 1) {
    const file = suffixMatches[0][1];
    return {
      resolvedFilePath: path.join(context.projectRoot, file),
      resolvedRelativePath: file,
      resolutionStatus: "resolved",
      confidence: 0.86,
      resolverId,
      dependencyCategory: "internal",
      evidence: ["unique repository include-suffix match"],
    };
  }
  if (suffixMatches.length > 1)
    return {
      resolutionStatus: "ambiguous",
      confidence: 0.45,
      resolverId,
      dependencyCategory: "unresolved",
      evidence: suffixMatches.map(([, file]) => `candidate '${file}'`),
      diagnostics: [
        {
          file: context.importerRelativePath,
          message: `${languageName} include '${specifier}' has ${suffixMatches.length} repository candidates.`,
          severity: "warning",
          code: "C_INCLUDE_AMBIGUOUS",
        },
      ],
    };
  return {
    resolutionStatus: "unresolved",
    confidence: 0.95,
    resolverId,
    dependencyCategory: "unresolved",
    evidence: ["no importer-relative or unique repository include match"],
    diagnostics: [
      {
        file: context.importerRelativePath,
        message: `${languageName} include '${specifier}' could not be resolved.`,
        severity: "warning",
        code: "C_INCLUDE_UNRESOLVED",
      },
    ],
  };
}

function symbols(context: ExtractionContext): SymbolExtractionResult {
  const tree = (context.ast as NativeTree | undefined) ?? parserForC().parse(context.content);
  const declarations: SymbolDeclaration[] = [];
  walk(tree.rootNode, (node) => {
    if (!["function_definition", "struct_specifier", "enum_specifier"].includes(node.type)) return;
    const declarator = node.childForFieldName("declarator");
    const nameNode =
      node.childForFieldName("name") ??
      declarator?.descendantsOfType(["identifier", "field_identifier"])[0];
    if (!nameNode) return;
    declarations.push({
      id: `${context.relativePath}#${nameNode.text}`,
      name: nameNode.text,
      kind: node.type === "function_definition" ? "function" : "class",
      exported: !node.text.includes("static "),
      location: location(nameNode),
    });
  });
  return { declarations, references: [], diagnostics: [] };
}

function entries(root: string, files: string[]): EntryPointHint[] {
  const hints: EntryPointHint[] = [];
  for (const relativePath of files.filter((file) => /\.(?:c|h)$/i.test(file))) {
    try {
      const tree = parserForC().parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
      let hasMain = false;
      walk(tree.rootNode, (node) => {
        if (
          node.type === "function_definition" &&
          node.childForFieldName("declarator")?.descendantsOfType("identifier")[0]?.text === "main"
        )
          hasMain = true;
      });
      if (hasMain)
        hints.push({
          filePath: path.join(root, relativePath),
          relativePath,
          reason: "C main function",
          confidence: 1,
        });
    } catch {
      // The main parse pass preserves diagnostics.
    }
  }
  return hints;
}

function buildMetadata(root: string, files: string[]) {
  const normalized = files.map(normalize);
  const metadata: Array<{ frameworkName: string; metadata: Record<string, unknown> }> = [];
  const cmake = normalized.filter((file) => path.posix.basename(file) === "CMakeLists.txt");
  const make = normalized.filter((file) => /(?:^|\/)(?:Makefile|GNUmakefile)$/.test(file));
  const meson = normalized.filter((file) => path.posix.basename(file) === "meson.build");
  const bazel = normalized.filter((file) =>
    /(?:^|\/)(?:BUILD|BUILD\.bazel|WORKSPACE|MODULE\.bazel)$/.test(file)
  );
  if (cmake.length)
    metadata.push({ frameworkName: "CMake", metadata: { buildSystem: "cmake", files: cmake } });
  if (make.length)
    metadata.push({ frameworkName: "Make", metadata: { buildSystem: "make", files: make } });
  if (meson.length)
    metadata.push({ frameworkName: "Meson", metadata: { buildSystem: "meson", files: meson } });
  if (bazel.length)
    metadata.push({ frameworkName: "Bazel", metadata: { buildSystem: "bazel", files: bazel } });
  return metadata;
}

export class CLanguagePlugin implements LanguagePlugin {
  id = "cascade-language-c";
  name = "Cascade C Language Plugin";
  version = "3.3.0";
  supportedExtensions = [".c", ".h"];
  fileDetectionRules = [
    { type: "extension" as const, pattern: ".c" },
    { type: "extension" as const, pattern: ".h" },
  ];
  analysisLevels = ["file-dependency", "symbol-dependency", "build-dependency"] as const;
  capabilities = {
    astParsing: true,
    symbolExtraction: true,
    dynamicDependencies: false,
    reExports: false,
    typeOnlyDependencies: false,
    moduleResolution: true,
    entryPointDetection: true,
    testFileDetection: true,
    generatedFileDetection: true,
    crossLanguageEdges: true,
  };
  limitations = {
    knownIssues: [
      "Preprocessor branches and compiler include paths are not evaluated without a concrete toolchain configuration.",
      "Build metadata is detected but arbitrary CMake, Make, Meson, and Bazel programs are not executed.",
    ],
    unsupportedFeatures: [
      "Macro-expanded include names",
      "Runtime dynamic-library symbol discovery",
    ],
  };
  parser = { parse };
  dependencyExtractor = {
    extractDependencies(context: ExtractionContext) {
      return extractCDependencies(context.relativePath, context.content, context.ast);
    },
  };
  symbolExtractor = { extractSymbols: symbols };
  moduleResolver = { resolveModule: resolveNativeInclude };
  entryPointHints = { detectEntryPoints: entries };
  testFileDetector = {
    isTestFile(_filePath: string, relativePath: string) {
      return /(?:^|\/)(?:test|tests)\/|(?:_test|\.test)\.c$/i.test(normalize(relativePath));
    },
  };
  generatedFileDetector = {
    isGeneratedFile(_filePath: string, relativePath: string, content?: string) {
      return (
        /(?:^|\/)(?:build|cmake-build-[^/]+|bazel-out|generated|gen|vendor|third_party)\//i.test(
          normalize(relativePath)
        ) || /(?:generated (?:file|code)|do not edit)/i.test((content ?? "").slice(0, 400))
      );
    },
  };
  configFileDetector = {
    isConfigFile(_filePath: string, relativePath: string) {
      return /(?:^|\/)(?:CMakeLists\.txt|Makefile|GNUmakefile|meson\.build|BUILD|BUILD\.bazel|WORKSPACE|MODULE\.bazel)$/.test(
        normalize(relativePath)
      );
    },
  };
  frameworkMetadata = { detectMetadata: buildMetadata };
}

export function createCPlugin(): LanguagePlugin {
  return new CLanguagePlugin();
}

export default createCPlugin;
