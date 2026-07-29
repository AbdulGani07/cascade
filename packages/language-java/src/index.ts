import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import Java from "tree-sitter-java";
import type {
  DependencyExtractionResult,
  EntryPointHint,
  ExtractedDependency,
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
type JavaAst = { tree: Parser.Tree; packageName?: string };

const posix = (value: string) => value.replace(/\\/g, "/");
const nodeLocation = (node: SyntaxNode): SourceLocation => ({
  startLine: node.startPosition.row + 1,
  startColumn: node.startPosition.column + 1,
  endLine: node.endPosition.row + 1,
  endColumn: node.endPosition.column + 1,
});

function walk(node: SyntaxNode, visit: (node: SyntaxNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function hasAncestor(node: SyntaxNode, types: Set<string>): boolean {
  let current = node.parent;
  while (current) {
    if (types.has(current.type)) return true;
    current = current.parent;
  }
  return false;
}

function parseJava(context: ParseContext): ParseResult {
  try {
    const parser = new Parser();
    parser.setLanguage(Java as unknown as Parser.Language);
    const tree = parser.parse(context.content);
    const diagnostics: ParseDiagnostic[] = [];
    walk(tree.rootNode, (node) => {
      if (node.type === "ERROR" || node.isMissing)
        diagnostics.push({
          file: context.relativePath,
          message: `Java syntax recovery at ${node.startPosition.row + 1}:${node.startPosition.column + 1}.`,
          severity: "error",
          code: "JAVA_PARSE_ERROR",
          location: nodeLocation(node),
        });
    });
    let packageName: string | undefined;
    walk(tree.rootNode, (node) => {
      if (node.type === "package_declaration")
        packageName = node.text
          .replace(/^package\s+/, "")
          .replace(/;\s*$/, "")
          .trim();
    });
    return {
      ast: { tree, packageName } satisfies JavaAst,
      status: diagnostics.length ? "partial" : "success",
      diagnostics,
    };
  } catch (error) {
    return {
      status: "failed",
      diagnostics: [
        {
          file: context.relativePath,
          message: `Java parser failed: ${(error as Error).message}`,
          severity: "error",
          code: "JAVA_PARSER_FAILURE",
        },
      ],
    };
  }
}

function extractJava(context: ExtractionContext): DependencyExtractionResult {
  const parsed = parseJava(context as ParseContext);
  const ast = parsed.ast as JavaAst | undefined;
  const dependencies: ExtractedDependency[] = [];
  if (!ast) return { dependencies, diagnostics: parsed.diagnostics };
  const emitted = new Set<string>();
  walk(ast.tree.rootNode, (node) => {
    if (node.type === "import_declaration") {
      const raw = node.text;
      const isStatic = /^import\s+static\b/.test(raw);
      const specifier = raw
        .replace(/^import\s+/, "")
        .replace(/^static\s+/, "")
        .replace(/;\s*$/, "")
        .trim();
      const wildcard = specifier.endsWith(".*");
      const normalized = wildcard ? specifier.slice(0, -2) : specifier;
      emitted.add(normalized);
      dependencies.push({
        specifier: normalized,
        importKind: "static",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
        sourceLocation: nodeLocation(node),
        rawText: raw,
        confidence: wildcard || isStatic ? 0.9 : 1,
        evidence: [
          "Tree-sitter Java import_declaration",
          isStatic
            ? "static member import"
            : wildcard
              ? "wildcard package import"
              : "explicit type import",
        ],
      });
    } else if (
      node.type === "scoped_type_identifier" &&
      /^[a-z_]\w*(?:\.[A-Za-z_]\w*){2,}$/.test(node.text) &&
      !hasAncestor(node, new Set(["package_declaration", "import_declaration"])) &&
      !emitted.has(node.text)
    ) {
      emitted.add(node.text);
      dependencies.push({
        specifier: node.text,
        importKind: "reference",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
        sourceLocation: nodeLocation(node),
        rawText: node.text,
        confidence: 0.9,
        evidence: ["Tree-sitter scoped_type_identifier with a fully-qualified type name"],
      });
    } else if (node.type === "requires_module_directive") {
      const specifier = node.text
        .replace(/^requires\s+(?:(?:transitive|static)\s+)*/, "")
        .replace(/;\s*$/, "")
        .trim();
      if (specifier && !emitted.has(specifier)) {
        emitted.add(specifier);
        dependencies.push({
          specifier,
          importKind: "reference",
          isStatic: true,
          isDynamic: false,
          isTypeOnly: false,
          isReExport: false,
          isConditional: false,
          sourceLocation: nodeLocation(node),
          rawText: node.text,
          confidence: 1,
          evidence: ["Tree-sitter JPMS requires_module_directive"],
        });
      }
    }
  });
  return { dependencies, diagnostics: parsed.diagnostics };
}

function sourceInfo(file: string): { packageName: string; typeName: string } {
  let packageName = "";
  try {
    const content = fs.readFileSync(file, "utf8");
    const match = /^\s*package\s+([\w.]+)\s*;/m.exec(content);
    packageName = match?.[1] ?? "";
  } catch {
    /* known files can disappear during an analysis */
  }
  return { packageName, typeName: path.basename(file, ".java") };
}

function resolveJava(context: ResolutionContext): ResolvedModuleResult {
  const known = context.allKnownFiles.filter((file) => file.endsWith(".java"));
  const candidates: string[] = [];
  const wanted = context.specifier.replace(/\.\*$/, "");
  for (const relative of known) {
    const info = sourceInfo(path.join(context.projectRoot, relative));
    const qualified = [info.packageName, info.typeName].filter(Boolean).join(".");
    if (qualified === wanted || info.packageName === wanted || wanted.startsWith(`${qualified}.`))
      candidates.push(relative);
  }
  if (candidates.length === 1)
    return {
      resolvedFilePath: path.join(context.projectRoot, candidates[0]),
      resolvedRelativePath: candidates[0],
      resolutionStatus: "resolved",
      confidence: context.extractedDependency.confidence ?? 1,
      resolverId: "java-package-index",
      dependencyCategory: "internal",
      evidence: [`matched declared Java package/type '${wanted}'`],
    };
  if (candidates.length > 1)
    return {
      resolutionStatus: "ambiguous",
      confidence: 0.5,
      resolverId: "java-package-index",
      dependencyCategory: "internal",
      evidence: candidates.map((candidate) => `candidate: ${candidate}`),
    };
  if (wanted.startsWith("java.") || wanted.startsWith("javax.") || wanted.startsWith("jdk."))
    return {
      resolutionStatus: "external",
      confidence: 0.99,
      resolverId: "java-platform-modules",
      dependencyCategory: "standard-library",
      evidence: ["Java/JDK platform namespace"],
    };
  const top = wanted.split(".").slice(0, 2).join(".");
  const declared = collectBuildDependencies(context.projectRoot);
  if (
    [...declared].some(
      (coordinate) => coordinate.includes(top) || wanted.includes(coordinate.split(":")[0])
    )
  )
    return {
      resolutionStatus: "external",
      confidence: 0.75,
      resolverId: "java-build-metadata",
      dependencyCategory: "external",
      evidence: ["matched Maven or Gradle dependency metadata"],
    };
  return {
    resolutionStatus: "unresolved",
    confidence: 0,
    resolverId: "java-package-index",
    dependencyCategory: "unresolved",
    diagnostics: [
      {
        file: context.importerRelativePath,
        message: `Unable to resolve Java import '${context.specifier}'.`,
        severity: "warning",
        code: "JAVA_UNRESOLVED_IMPORT",
      },
    ],
  };
}

function collectBuildDependencies(root: string): Set<string> {
  const result = new Set<string>();
  const visit = (dir: string, depth: number) => {
    if (depth > 5) return;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === ".git" || entry.name === "build" || entry.name === "target") continue;
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) visit(target, depth + 1);
      else if (entry.name === "pom.xml") {
        const xml = fs.readFileSync(target, "utf8");
        for (const match of xml.matchAll(
          /<groupId>([^<]+)<\/groupId>\s*<artifactId>([^<]+)<\/artifactId>/g
        ))
          result.add(`${match[1]}:${match[2]}`);
      } else if (/^build\.gradle(?:\.kts)?$/.test(entry.name)) {
        const gradle = fs.readFileSync(target, "utf8");
        for (const match of gradle.matchAll(/["']([\w.-]+):([\w.-]+):[^"']+["']/g))
          result.add(`${match[1]}:${match[2]}`);
      }
    }
  };
  visit(root, 0);
  return result;
}

function javaEntries(root: string, files: string[]): EntryPointHint[] {
  const hints: EntryPointHint[] = [];
  for (const file of files.filter((candidate) => candidate.endsWith(".java"))) {
    let content = "";
    try {
      content = fs.readFileSync(path.join(root, file), "utf8");
    } catch {
      continue;
    }
    if (
      /\bpublic\s+static\s+void\s+main\s*\(\s*(?:String(?:\[\]|\.\.\.)|String\s*\[\s*\])/.test(
        content
      )
    )
      hints.push({
        filePath: path.join(root, file),
        relativePath: file,
        reason: /@SpringBootApplication\b/.test(content)
          ? "Spring Boot application with Java main method"
          : "Java public static void main method",
        confidence: 1,
      });
  }
  return hints;
}

function javaFrameworks(root: string, files: string[]): FrameworkMetadata[] {
  const metadata: FrameworkMetadata[] = [];
  const deps = collectBuildDependencies(root);
  if ([...deps].some((dep) => dep.includes("spring-boot")))
    metadata.push({ frameworkName: "Spring Boot", metadata: { evidence: ["build dependency"] } });
  if (files.some((file) => file.endsWith("module-info.java")))
    metadata.push({
      frameworkName: "Java Platform Module System",
      metadata: { evidence: ["module-info.java"] },
    });
  if (fs.existsSync(path.join(root, "pom.xml")))
    metadata.push({ frameworkName: "Maven", metadata: { buildSystem: "maven" } });
  if (
    fs.existsSync(path.join(root, "build.gradle")) ||
    fs.existsSync(path.join(root, "build.gradle.kts"))
  )
    metadata.push({ frameworkName: "Gradle", metadata: { buildSystem: "gradle" } });
  return metadata;
}

export class JavaLanguagePlugin implements LanguagePlugin {
  id = "cascade-language-java";
  name = "Cascade Java Language Plugin";
  version = "3.3.0";
  supportedExtensions = [".java"];
  fileDetectionRules = [{ type: "extension" as const, pattern: ".java" }];
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
      "Fully-qualified references are only resolved when represented by explicit imports or unambiguous build metadata",
      "Gradle program logic is not executed",
    ],
    unsupportedFeatures: [
      "Runtime reflection and class-loader dependencies",
      "Annotation-processor generated edges before generation",
    ],
  };
  analysisLevels = [
    "file-dependency",
    "module-dependency",
    "symbol-dependency",
    "build-dependency",
  ] as const;
  parser = { parse: parseJava };
  dependencyExtractor = { extractDependencies: extractJava };
  moduleResolver = { resolveModule: resolveJava };
  symbolExtractor = {
    extractSymbols(context: {
      relativePath: string;
      content: string;
      ast?: unknown;
    }): SymbolExtractionResult {
      const ast =
        (context.ast as JavaAst | undefined) ??
        (parseJava(context as ParseContext).ast as JavaAst | undefined);
      const declarations: SymbolDeclaration[] = [];
      if (ast)
        walk(ast.tree.rootNode, (node) => {
          if (
            ![
              "class_declaration",
              "interface_declaration",
              "enum_declaration",
              "record_declaration",
              "method_declaration",
            ].includes(node.type)
          )
            return;
          const name = node.childForFieldName("name");
          if (name)
            declarations.push({
              id: `${context.relativePath}#${name.text}`,
              name: name.text,
              kind: node.type === "method_declaration" ? "function" : "class",
              exported: /\bpublic\b/.test(node.text.slice(0, Math.min(node.text.length, 120))),
              location: nodeLocation(name),
            });
        });
      return { declarations, references: [], diagnostics: [] };
    },
  };
  entryPointHints = { detectEntryPoints: javaEntries };
  testFileDetector = {
    isTestFile: (_filePath: string, relativePath: string) =>
      /(?:^|\/)src\/test\//i.test(posix(relativePath)) ||
      /(?:Test|Tests|IT)\.java$/i.test(relativePath),
  };
  generatedFileDetector = {
    isGeneratedFile: (_filePath: string, relativePath: string, content?: string) =>
      /(?:^|\/)(?:target\/generated-sources|build\/generated|generated\/sources?)\//i.test(
        posix(relativePath)
      ) ||
      /@(Generated|javax\.annotation\.Generated)\b|auto-generated|generated by/i.test(
        content ?? ""
      ),
  };
  configFileDetector = {
    isConfigFile: (_filePath: string, relativePath: string) =>
      /(?:^|\/)(?:pom\.xml|settings\.gradle(?:\.kts)?|build\.gradle(?:\.kts)?|gradle\.properties)$/i.test(
        posix(relativePath)
      ),
  };
  frameworkMetadata = { detectMetadata: javaFrameworks };
}

export const createJavaPlugin = () => new JavaLanguagePlugin();
export { extractJava as extractJavaDependencies };
