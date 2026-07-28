import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import Go from "tree-sitter-go";
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
} from "@cascade/plugin-api";

type GoTree = Parser.Tree;
type GoNode = Parser.SyntaxNode;
type Module = { modulePath: string; directory: string; replacements: Map<string, string> };

function parseGoWork(file: string): string[] {
  try {
    const content = fs.readFileSync(file, "utf8");
    const paths: string[] = [];
    for (const match of content.matchAll(/^\s*use\s+(\S+)/gm))
      if (match[1] !== "(") paths.push(match[1]);
    const block = /use\s*\(([\s\S]*?)\)/m.exec(content)?.[1] ?? "";
    for (const line of block.split(/\r?\n/)) {
      const value = line.trim().split(/\s+/)[0];
      if (value && !value.startsWith("//")) paths.push(value);
    }
    return [...new Set(paths)];
  } catch {
    return [];
  }
}

const STANDARD_PACKAGES = new Set(
  `archive/tar archive/zip bufio builtin bytes cmp compress/bzip2 compress/flate compress/gzip
  compress/lzw compress/zlib container/heap container/list container/ring context crypto crypto/aes
  crypto/cipher crypto/des crypto/dsa crypto/ecdh crypto/ecdsa crypto/ed25519 crypto/elliptic crypto/hmac
  crypto/md5 crypto/rand crypto/rc4 crypto/rsa crypto/sha1 crypto/sha256 crypto/sha512 crypto/subtle
  crypto/tls crypto/x509 database/sql debug/buildinfo debug/dwarf debug/elf debug/gosym debug/macho
  debug/pe embed encoding encoding/ascii85 encoding/asn1 encoding/base32 encoding/base64 encoding/binary
  encoding/csv encoding/gob encoding/hex encoding/json encoding/pem encoding/xml errors expvar flag fmt
  go/ast go/build go/constant go/doc go/format go/importer go/parser go/printer go/scanner go/token go/types
  hash hash/adler32 hash/crc32 hash/crc64 hash/fnv html html/template image image/color image/draw image/gif
  image/jpeg image/png index/suffixarray io io/fs io/ioutil log log/slog log/syslog maps math math/big
  math/bits math/cmplx math/rand mime mime/multipart mime/quotedprintable net net/http net/mail net/netip
  net/rpc net/smtp net/textproto net/url os os/exec os/signal os/user path path/filepath plugin reflect
  regexp runtime slices sort strconv strings sync sync/atomic syscall testing testing/fstest text/scanner
  text/tabwriter text/template time unicode unicode/utf8 unique unsafe weak`.split(/\s+/)
);

function sourceLocation(node: GoNode): SourceLocation {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
}

function walk(node: GoNode, visit: (node: GoNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function parserForGo(): Parser {
  const parser = new Parser();
  parser.setLanguage(Go as unknown as Parser.Language);
  return parser;
}

function parse(context: ParseContext): ParseResult {
  try {
    const tree = parserForGo().parse(context.content);
    const diagnostics: ParseDiagnostic[] = [];
    walk(tree.rootNode, (node) => {
      if (node.type !== "ERROR" && !node.isMissing) return;
      diagnostics.push({
        file: context.relativePath,
        message: node.isMissing
          ? `Missing ${node.type} in Go syntax tree.`
          : `Invalid Go syntax near '${node.text.slice(0, 80)}'.`,
        severity: "error",
        code: "GO_PARSE_ERROR",
        location: sourceLocation(node),
      });
    });
    return { ast: tree, status: diagnostics.length ? "partial" : "success", diagnostics };
  } catch (error) {
    return {
      status: "failed",
      diagnostics: [
        {
          file: context.relativePath,
          message: `Go parser failed: ${(error as Error).message}`,
          severity: "error",
          code: "GO_PARSER_FAILURE",
        },
      ],
    };
  }
}

function unquote(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("`") && value.endsWith("`"))
  )
    return value.slice(1, -1);
  return value;
}

export function extractGoDependencies(
  relativePath: string,
  content: string,
  suppliedTree?: unknown
): DependencyExtractionResult {
  const tree =
    suppliedTree instanceof Object && "rootNode" in suppliedTree
      ? (suppliedTree as GoTree)
      : parserForGo().parse(content);
  const dependencies: DependencyExtractionResult["dependencies"] = [];
  const diagnostics: ParseDiagnostic[] = [];
  const buildConstraint = content
    .split(/\r?\n/, 12)
    .find((line) => /^\/\/(?:go:build|\s*\+build)\s+/.test(line));
  if (buildConstraint)
    diagnostics.push({
      file: relativePath,
      message: `Build constraint '${buildConstraint.trim()}' is preserved as evidence but not evaluated against a target environment.`,
      severity: "info",
      code: "GO_BUILD_CONSTRAINT",
    });

  walk(tree.rootNode, (node) => {
    if (node.type !== "import_spec") return;
    const pathNode =
      node.childForFieldName("path") ??
      node.namedChildren.find((child) => child.type.includes("string"));
    if (!pathNode) return;
    const specifier = unquote(pathNode.text);
    const nameNode = node.childForFieldName("name");
    const alias = nameNode?.text;
    const cgo = specifier === "C";
    dependencies.push({
      specifier,
      importKind: cgo ? "reference" : alias === "_" ? "side-effect" : "static",
      isStatic: true,
      isDynamic: false,
      isTypeOnly: false,
      isReExport: false,
      isConditional: Boolean(buildConstraint),
      sourceLocation: sourceLocation(node),
      rawText: node.text,
      importedNames: alias ? [alias] : undefined,
      confidence: buildConstraint ? 0.85 : 1,
      evidence: [
        "Tree-sitter Go import_spec",
        ...(alias === "_" ? ["blank import used for initialization side effects"] : []),
        ...(alias && alias !== "_" && alias !== "." ? [`import alias '${alias}'`] : []),
        ...(cgo ? ["cgo pseudo-package import"] : []),
        ...(buildConstraint ? [`guarded by ${buildConstraint.trim()}`] : []),
      ],
    });
  });
  return { dependencies, diagnostics };
}

function findUp(start: string, name: string, boundary: string): string | undefined {
  let current = path.resolve(start);
  const root = path.resolve(boundary);
  while (current.startsWith(root)) {
    const candidate = path.join(current, name);
    if (fs.existsSync(candidate)) return candidate;
    if (current === root) break;
    current = path.dirname(current);
  }
  return undefined;
}

function parseGoMod(file: string): Module | undefined {
  try {
    const content = fs.readFileSync(file, "utf8");
    const modulePath = /^\s*module\s+(\S+)/m.exec(content)?.[1];
    if (!modulePath) return undefined;
    const replacements = new Map<string, string>();
    for (const match of content.matchAll(/^\s*replace\s+(\S+)(?:\s+\S+)?\s*=>\s*(\S+)/gm))
      replacements.set(match[1], match[2]);
    const block = /replace\s*\(([\s\S]*?)\)/m.exec(content)?.[1] ?? "";
    for (const line of block.split(/\r?\n/)) {
      const match = /^\s*(\S+)(?:\s+\S+)?\s*=>\s*(\S+)/.exec(line);
      if (match) replacements.set(match[1], match[2]);
    }
    return { modulePath, directory: path.dirname(file), replacements };
  } catch {
    return undefined;
  }
}

function discoverModules(context: ResolutionContext): Module[] {
  const modules = new Map<string, Module>();
  for (const relative of context.allKnownFiles) {
    if (!relative.endsWith(".go")) continue;
    const absolute = path.join(context.projectRoot, relative);
    const modFile = findUp(path.dirname(absolute), "go.mod", context.projectRoot);
    if (modFile && !modules.has(modFile)) {
      const parsed = parseGoMod(modFile);
      if (parsed) modules.set(modFile, parsed);
    }
  }
  return [...modules.values()];
}

function packageFiles(context: ResolutionContext, directory: string): string[] {
  const normalized = path.resolve(directory);
  return context.allKnownFiles
    .filter(
      (file) =>
        file.endsWith(".go") && path.dirname(path.resolve(context.projectRoot, file)) === normalized
    )
    .filter((file) => !file.endsWith("_test.go"))
    .sort();
}

function resolveGo(context: ResolutionContext): ResolvedModuleResult {
  const specifier = context.specifier;
  if (specifier === "C")
    return {
      resolutionStatus: "external",
      confidence: 1,
      resolverId: "go-module-resolver",
      dependencyCategory: "external",
      evidence: ["Go compiler cgo pseudo-package"],
    };
  if (STANDARD_PACKAGES.has(specifier))
    return {
      resolutionStatus: "external",
      confidence: 0.99,
      resolverId: "go-module-resolver",
      dependencyCategory: "standard-library",
      evidence: ["matched Go standard-library import path"],
    };

  const modules = discoverModules(context);
  for (const module of modules) {
    if (specifier !== module.modulePath && !specifier.startsWith(`${module.modulePath}/`)) continue;
    const suffix = specifier.slice(module.modulePath.length).replace(/^\//, "");
    const targetDirectory = path.join(module.directory, suffix);
    const internalIndex = specifier.indexOf("/internal/");
    if (internalIndex >= 0) {
      const allowedPrefix = specifier.slice(0, internalIndex);
      const importerModule = modules.find((candidate) =>
        path.resolve(context.importerFilePath).startsWith(path.resolve(candidate.directory))
      );
      if (!importerModule?.modulePath.startsWith(allowedPrefix))
        return {
          resolutionStatus: "unresolved",
          confidence: 1,
          resolverId: "go-module-resolver",
          dependencyCategory: "unresolved",
          diagnostics: [
            {
              file: context.importerRelativePath,
              message: `Import '${specifier}' violates Go internal package visibility.`,
              severity: "error",
              code: "GO_INTERNAL_VISIBILITY",
            },
          ],
          evidence: [`internal package is restricted to '${allowedPrefix}'`],
        };
    }
    const files = packageFiles(context, targetDirectory);
    if (files.length)
      return {
        resolvedFilePath: path.join(context.projectRoot, files[0]),
        resolvedRelativePath: files[0],
        resolutionStatus: "resolved",
        confidence: 0.95,
        resolverId: "go-module-resolver",
        dependencyCategory: "internal",
        evidence: [
          `matched module '${module.modulePath}' package directory`,
          `representative package file '${files[0]}'`,
        ],
      };
    return {
      resolutionStatus: "unresolved",
      confidence: 1,
      resolverId: "go-module-resolver",
      dependencyCategory: "unresolved",
      diagnostics: [
        {
          file: context.importerRelativePath,
          message: `Import '${specifier}' belongs to workspace module '${module.modulePath}' but no package files were found.`,
          severity: "warning",
          code: "GO_PACKAGE_NOT_FOUND",
        },
      ],
      evidence: [`matched module prefix '${module.modulePath}'`],
    };
  }

  for (const module of modules) {
    for (const [oldPath, replacement] of module.replacements) {
      if (specifier !== oldPath && !specifier.startsWith(`${oldPath}/`)) continue;
      if (!replacement.startsWith(".")) continue;
      const suffix = specifier.slice(oldPath.length).replace(/^\//, "");
      const files = packageFiles(context, path.resolve(module.directory, replacement, suffix));
      if (files.length)
        return {
          resolvedFilePath: path.join(context.projectRoot, files[0]),
          resolvedRelativePath: files[0],
          resolutionStatus: "resolved",
          confidence: 0.98,
          resolverId: "go-module-resolver",
          dependencyCategory: "internal",
          evidence: [
            `go.mod replace '${oldPath} => ${replacement}'`,
            `representative package file '${files[0]}'`,
          ],
        };
    }
  }

  if (specifier.split("/")[0].includes("."))
    return {
      resolutionStatus: "external",
      confidence: 0.9,
      resolverId: "go-module-resolver",
      dependencyCategory: "external",
      evidence: ["canonical remote Go import path; no matching workspace module or local replace"],
    };
  return {
    resolutionStatus: "unresolved",
    confidence: 0.95,
    resolverId: "go-module-resolver",
    dependencyCategory: "unresolved",
    diagnostics: [
      {
        file: context.importerRelativePath,
        message: `Go import '${specifier}' is neither a standard package nor a known module package.`,
        severity: "warning",
        code: "GO_IMPORT_UNRESOLVED",
      },
    ],
    evidence: ["no standard-library, module, workspace, or replace match"],
  };
}

function extractSymbols(context: ExtractionContext): SymbolExtractionResult {
  const tree = (context.ast as GoTree | undefined) ?? parserForGo().parse(context.content);
  const declarations: SymbolDeclaration[] = [];
  walk(tree.rootNode, (node) => {
    if (!["function_declaration", "method_declaration", "type_declaration"].includes(node.type))
      return;
    const name = node.childForFieldName("name")?.text;
    if (!name) return;
    declarations.push({
      id: `${context.relativePath}#${name}`,
      name,
      kind: node.type === "type_declaration" ? "class" : "function",
      exported: /^[A-Z]/.test(name),
      location: sourceLocation(node),
    });
  });
  return { declarations, references: [], diagnostics: [] };
}

function detectEntryPoints(projectRoot: string, files: string[]): EntryPointHint[] {
  const hints: EntryPointHint[] = [];
  for (const relativePath of files.filter(
    (file) => file.endsWith(".go") && !file.endsWith("_test.go")
  )) {
    try {
      const content = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
      const tree = parserForGo().parse(content);
      let packageMain = false;
      let functionMain = false;
      walk(tree.rootNode, (node) => {
        if (node.type === "package_clause" && /\bmain\b/.test(node.text)) packageMain = true;
        if (node.type === "function_declaration" && node.childForFieldName("name")?.text === "main")
          functionMain = true;
      });
      if (packageMain && functionMain)
        hints.push({
          filePath: path.join(projectRoot, relativePath),
          relativePath,
          reason: "Go package main with func main",
          confidence: 1,
        });
    } catch {
      // Parser diagnostics are emitted by the normal analysis pass.
    }
  }
  return hints;
}

export class GoLanguagePlugin implements LanguagePlugin {
  id = "cascade-language-go";
  name = "Cascade Go Language Plugin";
  version = "2.3.0";
  supportedExtensions = [".go"];
  fileDetectionRules = [
    { type: "extension" as const, pattern: ".go" },
    { type: "filename" as const, pattern: "go.mod" },
    { type: "filename" as const, pattern: "go.work" },
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
      "Build constraints are recorded but not evaluated without a configured GOOS, GOARCH, and tag set.",
      "An imported Go package resolves to a representative source file because Cascade edges are file-based.",
      "Remote module versions and the module cache are not downloaded or inspected.",
    ],
    unsupportedFeatures: [
      "Runtime plugin.Open symbol discovery",
      "Compiler-generated dependencies not represented by imports or build metadata",
    ],
  };
  analysisLevels = [
    "file-dependency",
    "module-dependency",
    "symbol-dependency",
    "build-dependency",
  ] as const;
  parser = { parse };
  dependencyExtractor = {
    extractDependencies(context: ExtractionContext) {
      return extractGoDependencies(context.relativePath, context.content, context.ast);
    },
  };
  symbolExtractor = { extractSymbols };
  moduleResolver = { resolveModule: resolveGo };
  entryPointHints = { detectEntryPoints };
  testFileDetector = {
    isTestFile(_filePath: string, relativePath: string) {
      return relativePath.endsWith("_test.go");
    },
  };
  generatedFileDetector = {
    isGeneratedFile(_filePath: string, relativePath: string, content?: string) {
      return (
        /(?:^|\/)(?:vendor|testdata|generated|gen)\//.test(relativePath.replace(/\\/g, "/")) ||
        /^\/\/ Code generated .* DO NOT EDIT\./m.test(content ?? "")
      );
    },
  };
  configFileDetector = {
    isConfigFile(_filePath: string, relativePath: string) {
      return /(?:^|\/)(?:go\.mod|go\.sum|go\.work|go\.work\.sum)$/.test(
        relativePath.replace(/\\/g, "/")
      );
    },
  };
  frameworkMetadata = {
    detectMetadata(projectRoot: string, files: string[]) {
      const moduleFiles = new Set<string>();
      for (const file of files.filter((candidate) => candidate.endsWith(".go"))) {
        const goMod = findUp(path.dirname(path.join(projectRoot, file)), "go.mod", projectRoot);
        if (goMod) moduleFiles.add(path.relative(projectRoot, goMod).replace(/\\/g, "/"));
      }
      const metadata: Array<{
        frameworkName: string;
        metadata: Record<string, unknown>;
      }> = [];
      if (fs.existsSync(path.join(projectRoot, "go.work")))
        metadata.push({
          frameworkName: "Go workspace",
          metadata: {
            buildSystem: "go.work",
            useDirectories: parseGoWork(path.join(projectRoot, "go.work")),
            modules: [...moduleFiles].sort(),
          },
        });
      if (moduleFiles.size)
        metadata.push({
          frameworkName: "Go modules",
          metadata: { buildSystem: "go.mod", moduleFiles: [...moduleFiles].sort() },
        });
      return metadata;
    },
  };
}

export function createGoPlugin(): LanguagePlugin {
  return new GoLanguagePlugin();
}

export default createGoPlugin;
