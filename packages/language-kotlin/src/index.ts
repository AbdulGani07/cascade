import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import Kotlin from "@tree-sitter-grammars/tree-sitter-kotlin";
import type {
  DependencyExtractionResult,
  EntryPointHint,
  ExtractionContext,
  FrameworkMetadata,
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

type SyntaxNode = Parser.SyntaxNode;
type KotlinAst = { tree: Parser.Tree; packageName?: string };
const posix = (value: string) => value.replace(/\\/g, "/");
const location = (node: SyntaxNode): SourceLocation => ({
  startLine: node.startPosition.row + 1,
  startColumn: node.startPosition.column + 1,
  endLine: node.endPosition.row + 1,
  endColumn: node.endPosition.column + 1,
});
function walk(node: SyntaxNode, visit: (node: SyntaxNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function parseKotlin(context: ParseContext): ParseResult {
  try {
    const parser = new Parser();
    parser.setLanguage(Kotlin as unknown as Parser.Language);
    const tree = parser.parse(context.content);
    const diagnostics: ParseDiagnostic[] = [];
    let packageName: string | undefined;
    walk(tree.rootNode, (node) => {
      if (node.type === "package_header") packageName = node.text.replace(/^package\s+/, "").trim();
      if (node.type === "ERROR" || node.isMissing)
        diagnostics.push({
          file: context.relativePath,
          message: `Kotlin syntax recovery at ${node.startPosition.row + 1}:${node.startPosition.column + 1}.`,
          severity: "error",
          code: "KOTLIN_PARSE_ERROR",
          location: location(node),
        });
    });
    return {
      ast: { tree, packageName } satisfies KotlinAst,
      status: diagnostics.length ? "partial" : "success",
      diagnostics,
    };
  } catch (error) {
    return {
      status: "failed",
      diagnostics: [
        {
          file: context.relativePath,
          message: `Kotlin parser failed: ${(error as Error).message}`,
          severity: "error",
          code: "KOTLIN_PARSER_FAILURE",
        },
      ],
    };
  }
}

function extractKotlin(context: ExtractionContext): DependencyExtractionResult {
  const parsed = parseKotlin(context as ParseContext);
  const ast = parsed.ast as KotlinAst | undefined;
  const dependencies: DependencyExtractionResult["dependencies"] = [];
  if (ast)
    walk(ast.tree.rootNode, (node) => {
      if (node.type !== "import") return;
      const raw = node.text;
      const specifier = raw
        .replace(/^import\s+/, "")
        .replace(/\s+as\s+\w+\s*$/, "")
        .trim();
      const wildcard = specifier.endsWith(".*");
      dependencies.push({
        specifier: wildcard ? specifier.slice(0, -2) : specifier,
        importKind: "static",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
        rawText: raw,
        sourceLocation: location(node),
        confidence: wildcard ? 0.85 : 1,
        evidence: [
          "Tree-sitter Kotlin import node",
          wildcard ? "wildcard import" : "explicit import",
        ],
      });
    });
  return { dependencies, diagnostics: parsed.diagnostics };
}

function kotlinInfo(root: string, relative: string): { packageName: string; typeNames: string[] } {
  let content = "";
  try {
    content = fs.readFileSync(path.join(root, relative), "utf8");
  } catch {
    return { packageName: "", typeNames: [] };
  }
  const packageName = /^\s*package\s+([\w.]+)/m.exec(content)?.[1] ?? "";
  const typeNames = [
    ...content.matchAll(/\b(?:class|interface|object|typealias|enum\s+class)\s+([A-Za-z_]\w*)/g),
  ].map((match) => match[1]);
  typeNames.push(path.basename(relative).replace(/\.kts?$/, "Kt"));
  return { packageName, typeNames };
}

function resolveKotlin(context: ResolutionContext): ResolvedModuleResult {
  const wanted = context.specifier.replace(/\.\*$/, "");
  const matches: string[] = [];
  for (const relative of context.allKnownFiles.filter((file) => /\.kts?$/.test(file))) {
    const info = kotlinInfo(context.projectRoot, relative);
    if (
      info.packageName === wanted ||
      info.typeNames.some((name) => `${info.packageName}.${name}` === wanted)
    )
      matches.push(relative);
  }
  if (matches.length === 1)
    return {
      resolvedFilePath: path.join(context.projectRoot, matches[0]),
      resolvedRelativePath: matches[0],
      resolutionStatus: "resolved",
      confidence: context.extractedDependency.confidence ?? 1,
      resolverId: "kotlin-package-index",
      dependencyCategory: "internal",
      evidence: [`matched declared Kotlin package/type '${wanted}'`],
    };
  if (matches.length > 1)
    return {
      resolutionStatus: "ambiguous",
      confidence: 0.5,
      resolverId: "kotlin-package-index",
      dependencyCategory: "internal",
      evidence: matches.map((item) => `candidate: ${item}`),
    };
  if (/^(kotlin|kotlinx)\./.test(wanted))
    return {
      resolutionStatus: "external",
      confidence: wanted.startsWith("kotlin.") ? 0.99 : 0.8,
      resolverId: "kotlin-runtime",
      dependencyCategory: wanted.startsWith("kotlin.") ? "standard-library" : "external",
      evidence: [
        wanted.startsWith("kotlin.")
          ? "Kotlin standard-library namespace"
          : "Kotlin ecosystem namespace",
      ],
    };
  return {
    resolutionStatus: "unresolved",
    confidence: 0,
    resolverId: "kotlin-package-index",
    dependencyCategory: "unresolved",
    diagnostics: [
      {
        file: context.importerRelativePath,
        message: `Unable to resolve Kotlin import '${context.specifier}'.`,
        severity: "warning",
        code: "KOTLIN_UNRESOLVED_IMPORT",
      },
    ],
  };
}

function entries(root: string, files: string[]): EntryPointHint[] {
  const result: EntryPointHint[] = [];
  for (const file of files.filter((item) => /\.kts?$/.test(item))) {
    let content = "";
    try {
      content = fs.readFileSync(path.join(root, file), "utf8");
    } catch {
      continue;
    }
    if (/\bfun\s+main\s*\(/.test(content))
      result.push({
        filePath: path.join(root, file),
        relativePath: file,
        reason: "Kotlin main function",
        confidence: 1,
      });
    else if (file.endsWith(".kts") && !/(?:^|\/)(?:build|settings)\.gradle\.kts$/.test(posix(file)))
      result.push({
        filePath: path.join(root, file),
        relativePath: file,
        reason: "Executable Kotlin script",
        confidence: 0.8,
      });
  }
  return result;
}

function frameworks(root: string, files: string[]): FrameworkMetadata[] {
  const result: FrameworkMetadata[] = [];
  const gradleFiles = ["build.gradle.kts", "settings.gradle.kts"].filter((file) =>
    fs.existsSync(path.join(root, file))
  );
  if (gradleFiles.length)
    result.push({ frameworkName: "Gradle Kotlin DSL", metadata: { configFiles: gradleFiles } });
  const allBuildText = gradleFiles
    .map((file) => fs.readFileSync(path.join(root, file), "utf8"))
    .join("\n");
  if (/com\.android\.(application|library)/.test(allBuildText))
    result.push({ frameworkName: "Android", metadata: { evidence: ["Android Gradle plugin"] } });
  if (
    /kotlin\s*\(\s*["']multiplatform["']\s*\)|org\.jetbrains\.kotlin\.multiplatform/.test(
      allBuildText
    )
  )
    result.push({
      frameworkName: "Kotlin Multiplatform",
      metadata: { evidence: ["Kotlin multiplatform Gradle plugin"] },
    });
  if (
    files.some((file) => /src\/androidMain\//.test(posix(file))) &&
    !result.some((item) => item.frameworkName === "Kotlin Multiplatform")
  )
    result.push({
      frameworkName: "Kotlin Multiplatform",
      metadata: { evidence: ["multiplatform source set"] },
    });
  return result;
}

export class KotlinLanguagePlugin implements LanguagePlugin {
  id = "cascade-language-kotlin";
  name = "Cascade Kotlin Language Plugin";
  version = "3.3.1";
  supportedExtensions = [".kt", ".kts"];
  fileDetectionRules = [
    { type: "extension" as const, pattern: ".kt" },
    { type: "extension" as const, pattern: ".kts" },
  ];
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
      "Gradle Kotlin DSL is inspected as build metadata but arbitrary build code is not executed",
      "Default imports are implicit and are not emitted as source edges",
    ],
    unsupportedFeatures: [
      "Runtime reflection",
      "Kotlin compiler-plugin generated declarations before generation",
    ],
  };
  analysisLevels = [
    "file-dependency",
    "module-dependency",
    "symbol-dependency",
    "build-dependency",
  ] as const;
  parser = { parse: parseKotlin };
  dependencyExtractor = { extractDependencies: extractKotlin };
  moduleResolver = { resolveModule: resolveKotlin };
  symbolExtractor = {
    extractSymbols(context: {
      relativePath: string;
      content: string;
      ast?: unknown;
    }): SymbolExtractionResult {
      const ast =
        (context.ast as KotlinAst | undefined) ??
        (parseKotlin(context as ParseContext).ast as KotlinAst | undefined);
      const declarations: SymbolDeclaration[] = [];
      if (ast)
        walk(ast.tree.rootNode, (node) => {
          if (
            !["class_declaration", "object_declaration", "function_declaration"].includes(node.type)
          )
            return;
          const name =
            node.childForFieldName("name") ??
            node.namedChildren.find((child) => child.type === "simple_identifier");
          if (name)
            declarations.push({
              id: `${context.relativePath}#${name.text}`,
              name: name.text,
              kind: node.type === "function_declaration" ? "function" : "class",
              exported: !/\bprivate\b/.test(node.text.slice(0, Math.min(100, node.text.length))),
              location: location(name),
            });
        });
      return { declarations, references: [], diagnostics: [] };
    },
  };
  entryPointHints = { detectEntryPoints: entries };
  testFileDetector = {
    isTestFile: (_filePath: string, relativePath: string) =>
      /(?:^|\/)src\/(?:commonTest|jvmTest|androidTest|test)\//i.test(posix(relativePath)) ||
      /(?:Test|Spec)\.kts?$/i.test(relativePath),
  };
  generatedFileDetector = {
    isGeneratedFile: (_filePath: string, relativePath: string, content?: string) =>
      /(?:^|\/)(?:build\/generated|generated\/source|ksp\/|kapt\/)/i.test(posix(relativePath)) ||
      /@Generated\b|auto-generated|generated by/i.test(content ?? ""),
  };
  configFileDetector = {
    isConfigFile: (_filePath: string, relativePath: string) =>
      /(?:^|\/)(?:build|settings)\.gradle\.kts$/i.test(posix(relativePath)),
  };
  frameworkMetadata = { detectMetadata: frameworks };
}

export const createKotlinPlugin = () => new KotlinLanguagePlugin();
export { extractKotlin as extractKotlinDependencies };
