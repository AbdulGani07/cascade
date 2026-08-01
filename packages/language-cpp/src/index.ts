import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import Cpp from "tree-sitter-cpp";
import { extractCDependencies, resolveNativeInclude } from "@cascade-code/language-c";
import type {
  EntryPointHint,
  ExtractionContext,
  LanguagePlugin,
  ParseContext,
  ParseDiagnostic,
  ParseResult,
  ResolutionContext,
  SourceLocation,
  SymbolDeclaration,
  SymbolExtractionResult,
} from "@cascade-code/plugin-api";

type CppTree = Parser.Tree;
type CppNode = Parser.SyntaxNode;
const MAX_PARSE_DIAGNOSTICS = 50;

function parserForCpp(): Parser {
  const parser = new Parser();
  parser.setLanguage(Cpp);
  return parser;
}

function location(node: CppNode): SourceLocation {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
}

function walk(node: CppNode, visit: (node: CppNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function parse(context: ParseContext): ParseResult {
  try {
    const tree = parserForCpp().parse(context.content);
    const diagnostics: ParseDiagnostic[] = [];
    let truncated = false;
    walk(tree.rootNode, (node) => {
      if (node.type !== "ERROR" && !node.isMissing) return;
      if (diagnostics.length >= MAX_PARSE_DIAGNOSTICS) {
        truncated = true;
        return;
      }
      diagnostics.push({
        file: context.relativePath,
        message: node.isMissing
          ? `Missing ${node.type} in C++ syntax tree.`
          : `Invalid C++ syntax near '${node.text.slice(0, 80)}'.`,
        severity: "error",
        code: "CPP_PARSE_ERROR",
        location: location(node),
      });
    });
    if (truncated) {
      diagnostics.push({
        file: context.relativePath,
        message: `C++ parse diagnostics truncated after ${MAX_PARSE_DIAGNOSTICS} findings.`,
        severity: "warning",
        code: "CPP_PARSE_DIAGNOSTICS_TRUNCATED",
      });
    }
    return { ast: tree, status: diagnostics.length ? "partial" : "success", diagnostics };
  } catch (error) {
    return {
      status: "failed",
      diagnostics: [
        {
          file: context.relativePath,
          message: `C++ parser failed: ${(error as Error).message}`,
          severity: "error",
          code: "CPP_PARSER_FAILURE",
        },
      ],
    };
  }
}

function symbols(context: ExtractionContext): SymbolExtractionResult {
  const tree = (context.ast as CppTree | undefined) ?? parserForCpp().parse(context.content);
  const declarations: SymbolDeclaration[] = [];
  walk(tree.rootNode, (node) => {
    if (
      ![
        "function_definition",
        "class_specifier",
        "struct_specifier",
        "enum_specifier",
        "namespace_definition",
      ].includes(node.type)
    )
      return;
    const declarator = node.childForFieldName("declarator");
    const nameNode =
      node.childForFieldName("name") ??
      declarator?.descendantsOfType(["identifier", "field_identifier", "qualified_identifier"])[0];
    if (!nameNode) return;
    declarations.push({
      id: `${context.relativePath}#${nameNode.text}`,
      name: nameNode.text,
      kind:
        node.type === "function_definition"
          ? "function"
          : node.type === "namespace_definition"
            ? "module"
            : "class",
      exported: !node.text.includes("static "),
      location: location(nameNode),
    });
  });
  return { declarations, references: [], diagnostics: [] };
}

function entries(root: string, files: string[]): EntryPointHint[] {
  const hints: EntryPointHint[] = [];
  for (const relativePath of files.filter((file) => /\.(?:cc|cpp|cxx|c\+\+)$/i.test(file))) {
    try {
      const tree = parserForCpp().parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
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
          reason: "C++ main function",
          confidence: 1,
        });
    } catch {
      // Normal parse pass retains diagnostics.
    }
  }
  return hints;
}

function normalize(value: string): string {
  return value.replace(/\\/g, "/");
}

function metadata(_root: string, files: string[]) {
  const normalized = files.map(normalize);
  const result: Array<{ frameworkName: string; metadata: Record<string, unknown> }> = [];
  const definitions: Array<[string, string, RegExp]> = [
    ["CMake", "cmake", /(?:^|\/)CMakeLists\.txt$/],
    ["Make", "make", /(?:^|\/)(?:Makefile|GNUmakefile)$/],
    ["Meson", "meson", /(?:^|\/)meson\.build$/],
    ["Bazel", "bazel", /(?:^|\/)(?:BUILD|BUILD\.bazel|WORKSPACE|MODULE\.bazel)$/],
  ];
  for (const [frameworkName, buildSystem, matcher] of definitions) {
    const matches = normalized.filter((file) => matcher.test(file));
    if (matches.length) result.push({ frameworkName, metadata: { buildSystem, files: matches } });
  }
  return result;
}

export class CppLanguagePlugin implements LanguagePlugin {
  id = "cascade-language-cpp";
  name = "Cascade C++ Language Plugin";
  version = "3.3.1";
  supportedExtensions = [
    ".cc",
    ".cpp",
    ".cxx",
    ".c++",
    ".hh",
    ".hpp",
    ".hxx",
    ".h++",
    ".ipp",
    ".tpp",
  ];
  fileDetectionRules = this.supportedExtensions.map((pattern) => ({
    type: "extension" as const,
    pattern,
  }));
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
      "Templates, concepts, overload resolution, and macro semantics require a configured compiler frontend.",
      "Compiler include paths and conditional preprocessing are not evaluated.",
    ],
    unsupportedFeatures: [
      "C++20 named module resolution",
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
  moduleResolver = {
    resolveModule(context: ResolutionContext) {
      return resolveNativeInclude(context, "cpp-include-resolver", "C++");
    },
  };
  entryPointHints = { detectEntryPoints: entries };
  testFileDetector = {
    isTestFile(_filePath: string, relativePath: string) {
      return /(?:^|\/)(?:test|tests)\/|(?:_test|\.test)\.(?:cc|cpp|cxx)$/i.test(
        normalize(relativePath)
      );
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
  frameworkMetadata = { detectMetadata: metadata };
}

export function createCppPlugin(): LanguagePlugin {
  return new CppLanguagePlugin();
}

export default createCppPlugin;
