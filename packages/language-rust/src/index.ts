import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import Rust from "tree-sitter-rust";
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
} from "@cascade/plugin-api";

type RustTree = Parser.Tree;
type RustNode = Parser.SyntaxNode;
type CargoPackage = {
  name: string;
  directory: string;
  manifest: string;
  dependencies: Set<string>;
  workspaceMembers: string[];
};

const posix = (value: string) => value.replace(/\\/g, "/");
const location = (node: RustNode): SourceLocation => ({
  startLine: node.startPosition.row + 1,
  startColumn: node.startPosition.column + 1,
  endLine: node.endPosition.row + 1,
  endColumn: node.endPosition.column + 1,
});

function walk(node: RustNode, visit: (node: RustNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function newParser(): Parser {
  const parser = new Parser();
  parser.setLanguage(Rust as unknown as Parser.Language);
  return parser;
}

function parseRust(context: ParseContext): ParseResult {
  try {
    const tree = newParser().parse(context.content);
    const diagnostics: ParseDiagnostic[] = [];
    walk(tree.rootNode, (node) => {
      if (node.type !== "ERROR" && !node.isMissing) return;
      diagnostics.push({
        file: context.relativePath,
        message: node.isMissing
          ? `Missing Rust syntax element '${node.type}'.`
          : `Rust syntax recovery near '${node.text.slice(0, 80)}'.`,
        severity: "error",
        code: "RUST_PARSE_ERROR",
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
          message: `Rust parser failed: ${(error as Error).message}`,
          severity: "error",
          code: "RUST_PARSER_FAILURE",
        },
      ],
    };
  }
}

function firstUsePath(text: string): string | undefined {
  const cleaned = text
    .replace(/^(?:pub(?:\([^)]*\))?\s+)?use\s+/, "")
    .replace(/;\s*$/, "")
    .replace(/^::/, "")
    .trim();
  const match = /^(?:(?:pub|crate|self|super)\s+)?([A-Za-z_][\w]*(?:::[A-Za-z_][\w]*)*)/.exec(
    cleaned
  );
  return match?.[1];
}

export function extractRustDependencies(
  relativePath: string,
  content: string,
  suppliedTree?: unknown
): DependencyExtractionResult {
  const tree =
    suppliedTree && typeof suppliedTree === "object" && "rootNode" in suppliedTree
      ? (suppliedTree as RustTree)
      : newParser().parse(content);
  const dependencies: DependencyExtractionResult["dependencies"] = [];
  const diagnostics: ParseDiagnostic[] = [];

  walk(tree.rootNode, (node) => {
    if (node.type === "use_declaration") {
      const specifier = firstUsePath(node.text);
      if (!specifier) return;
      const wildcard = node.text.includes("::*");
      dependencies.push({
        specifier,
        importKind: "static",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: /^\s*pub\s+use\b/.test(node.text),
        isConditional: false,
        sourceLocation: location(node),
        rawText: node.text,
        confidence: wildcard ? 0.85 : 1,
        evidence: [
          "Tree-sitter Rust use_declaration",
          ...(wildcard ? ["glob import; symbol ownership is not inferred"] : []),
          ...(/^\s*pub\s+use\b/.test(node.text) ? ["public re-export"] : []),
        ],
      });
      return;
    }
    if (node.type === "extern_crate_declaration") {
      const name = node.namedChildren.find((child) => child.type === "identifier")?.text;
      if (!name) return;
      dependencies.push({
        specifier: name,
        importKind: "static",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
        sourceLocation: location(node),
        rawText: node.text,
        confidence: 1,
        evidence: ["Tree-sitter Rust extern_crate_declaration"],
      });
      return;
    }
    if (
      node.type === "mod_item" &&
      !node.namedChildren.some((child) => child.type === "declaration_list")
    ) {
      const name =
        node.childForFieldName("name")?.text ??
        node.namedChildren.find((child) => child.type === "identifier")?.text;
      if (!name) return;
      dependencies.push({
        specifier: `self::${name}`,
        importKind: "reference",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
        sourceLocation: location(node),
        rawText: node.text,
        confidence: 1,
        evidence: ["Tree-sitter Rust out-of-line mod_item"],
      });
      return;
    }
    if (node.type !== "macro_invocation") return;
    const macro =
      /^([A-Za-z_][\w]*)!/.exec(node.text.trim())?.[1] ??
      node.childForFieldName("macro")?.text ??
      node.namedChildren[0]?.text;
    if (!["include", "include_str", "include_bytes"].includes(macro ?? "")) return;
    const literal = new RegExp(`^\\s*${macro}!\\s*\\(\\s*[br]*"([^"]+)"`).exec(node.text)?.[1];
    if (!literal) {
      diagnostics.push({
        file: relativePath,
        message: `${macro}! uses a non-literal path and cannot be resolved statically.`,
        severity: "info",
        code: "RUST_DYNAMIC_INCLUDE",
        location: location(node),
      });
      return;
    }
    dependencies.push({
      specifier: literal,
      importKind: "reference",
      isStatic: true,
      isDynamic: false,
      isTypeOnly: false,
      isReExport: false,
      isConditional: false,
      sourceLocation: location(node),
      rawText: node.text,
      confidence: 1,
      evidence: [`Tree-sitter Rust ${macro}! macro with literal path`],
    });
  });
  return { dependencies, diagnostics };
}

function readCargo(manifest: string): CargoPackage | undefined {
  try {
    const source = fs.readFileSync(manifest, "utf8");
    const packageBlock = /\[package\]([\s\S]*?)(?=\n\[|$)/.exec(source)?.[1] ?? "";
    const name = /^\s*name\s*=\s*"([^"]+)"/m.exec(packageBlock)?.[1];
    if (!name && !/\[workspace\]/.test(source)) return undefined;
    const dependencies = new Set<string>();
    for (const block of source.matchAll(
      /\[(?:[^\]]*\.)?(?:dev-|build-)?dependencies\]([\s\S]*?)(?=\n\[|$)/g
    ))
      for (const match of block[1].matchAll(/^\s*([A-Za-z_][\w-]*)\s*=/gm))
        dependencies.add(match[1].replace(/-/g, "_"));
    for (const match of source.matchAll(
      /^\s*([A-Za-z_][\w-]*)\s*=\s*\{[^}]*\bpackage\s*=\s*"([^"]+)"/gm
    ))
      dependencies.add(match[1].replace(/-/g, "_"));
    const membersBlock = /\[workspace\]([\s\S]*?)(?=\n\[|$)/.exec(source)?.[1] ?? "";
    const memberList = /\bmembers\s*=\s*\[([\s\S]*?)\]/.exec(membersBlock)?.[1] ?? "";
    const workspaceMembers = [...memberList.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
    return {
      name: (name ?? path.basename(path.dirname(manifest))).replace(/-/g, "_"),
      directory: path.dirname(manifest),
      manifest,
      dependencies,
      workspaceMembers,
    };
  } catch {
    return undefined;
  }
}

function manifests(context: ResolutionContext): CargoPackage[] {
  const candidates = new Set<string>();
  let current = path.dirname(context.importerFilePath);
  const boundary = path.resolve(context.projectRoot);
  while (current.startsWith(boundary)) {
    const candidate = path.join(current, "Cargo.toml");
    if (fs.existsSync(candidate)) candidates.add(candidate);
    if (current === boundary) break;
    current = path.dirname(current);
  }
  for (const relative of context.allKnownFiles) {
    let directory = path.dirname(path.join(context.projectRoot, relative));
    while (directory.startsWith(boundary)) {
      const candidate = path.join(directory, "Cargo.toml");
      if (fs.existsSync(candidate)) candidates.add(candidate);
      if (directory === boundary) break;
      directory = path.dirname(directory);
    }
  }
  return [...candidates].map(readCargo).filter((item): item is CargoPackage => Boolean(item));
}

function rustCandidates(context: ResolutionContext, specifier: string): string[] {
  const importer = posix(context.importerRelativePath);
  const baseDirectory = path.posix.dirname(importer);
  const normalized = specifier.replace(/^::/, "");
  let segments = normalized.split("::").filter(Boolean);
  let root = baseDirectory;
  if (segments[0] === "crate") {
    segments = segments.slice(1);
    const srcIndex = importer.split("/").lastIndexOf("src");
    root =
      srcIndex >= 0
        ? importer
            .split("/")
            .slice(0, srcIndex + 1)
            .join("/")
        : baseDirectory;
  } else if (segments[0] === "self") {
    segments = segments.slice(1);
  } else {
    while (segments[0] === "super") {
      segments = segments.slice(1);
      root = path.posix.dirname(root);
    }
  }
  const candidates: string[] = [];
  // A use path may end in a symbol rather than a module. Try the complete path,
  // then progressively remove terminal segments without claiming symbol resolution.
  for (let length = segments.length; length > 0; length--) {
    const joined = path.posix.join(root, ...segments.slice(0, length));
    candidates.push(`${joined}.rs`, `${joined}/mod.rs`);
  }
  return candidates;
}

function resolveRust(context: ResolutionContext): ResolvedModuleResult {
  const specifier = context.specifier;
  if (/^(?:\.{1,2}\/|\/)/.test(specifier) || /\.(?:rs|txt|json|toml|bin)$/.test(specifier)) {
    const relative = posix(
      path.relative(
        context.projectRoot,
        path.resolve(path.dirname(context.importerFilePath), specifier)
      )
    );
    if (
      context.allKnownFiles.map(posix).includes(relative) ||
      fs.existsSync(path.join(context.projectRoot, relative))
    )
      return {
        resolvedFilePath: path.join(context.projectRoot, relative),
        resolvedRelativePath: relative,
        resolutionStatus: "resolved",
        confidence: 1,
        resolverId: "rust-cargo-resolver",
        dependencyCategory: "internal",
        evidence: ["literal Rust include path relative to importer"],
      };
  }
  const known = new Set(context.allKnownFiles.map(posix));
  for (const candidate of rustCandidates(context, specifier))
    if (known.has(candidate))
      return {
        resolvedFilePath: path.join(context.projectRoot, candidate),
        resolvedRelativePath: candidate,
        resolutionStatus: "resolved",
        confidence: 0.98,
        resolverId: "rust-cargo-resolver",
        dependencyCategory: "internal",
        evidence: [`matched Rust module file '${candidate}'`],
      };

  const root = specifier.replace(/^::/, "").split("::")[0].replace(/-/g, "_");
  const packages = manifests(context);
  const workspace = packages.find((item) => item.name === root);
  if (workspace) {
    const candidates = [
      path.join(workspace.directory, "src/lib.rs"),
      path.join(workspace.directory, "src/main.rs"),
    ];
    const target = candidates.find(fs.existsSync);
    if (target) {
      const relative = posix(path.relative(context.projectRoot, target));
      return {
        resolvedFilePath: target,
        resolvedRelativePath: relative,
        resolutionStatus: "resolved",
        confidence: 0.95,
        resolverId: "rust-cargo-resolver",
        dependencyCategory: "internal",
        evidence: [`matched Cargo workspace package '${workspace.name}'`],
      };
    }
  }
  const importerPackage = packages
    .filter((item) =>
      path.resolve(context.importerFilePath).startsWith(path.resolve(item.directory))
    )
    .sort((a, b) => b.directory.length - a.directory.length)[0];
  if (importerPackage?.dependencies.has(root))
    return {
      resolutionStatus: "external",
      confidence: 0.98,
      resolverId: "rust-cargo-resolver",
      dependencyCategory: "external",
      evidence: [`declared Cargo dependency '${root}'`],
    };
  if (["std", "core", "alloc", "proc_macro", "test"].includes(root))
    return {
      resolutionStatus: "external",
      confidence: 1,
      resolverId: "rust-cargo-resolver",
      dependencyCategory: "standard-library",
      evidence: [`Rust toolchain crate '${root}'`],
    };
  return {
    resolutionStatus: "unresolved",
    confidence: 0.9,
    resolverId: "rust-cargo-resolver",
    dependencyCategory: "unresolved",
    diagnostics: [
      {
        file: context.importerRelativePath,
        message: `Rust dependency '${specifier}' did not match a module, workspace crate, or Cargo dependency.`,
        severity: "warning",
        code: "RUST_IMPORT_UNRESOLVED",
      },
    ],
    evidence: ["no Rust module file or Cargo metadata match"],
  };
}

function symbols(context: ExtractionContext): SymbolExtractionResult {
  const tree = (context.ast as RustTree | undefined) ?? newParser().parse(context.content);
  const declarations: SymbolDeclaration[] = [];
  walk(tree.rootNode, (node) => {
    if (
      !["function_item", "struct_item", "enum_item", "trait_item", "type_item"].includes(node.type)
    )
      return;
    const name = node.childForFieldName("name")?.text;
    if (!name) return;
    declarations.push({
      id: `${context.relativePath}#${name}`,
      name,
      kind: node.type === "function_item" ? "function" : "class",
      exported: /^\s*pub\b/.test(node.text),
      location: location(node),
    });
  });
  return { declarations, references: [], diagnostics: [] };
}

function entryPoints(projectRoot: string, files: string[]): EntryPointHint[] {
  const hints: EntryPointHint[] = [];
  for (const relativePath of files.filter((file) => file.endsWith(".rs"))) {
    const basename = path.basename(relativePath);
    if (basename === "main.rs" || /(?:^|\/)src\/bin\/[^/]+\.rs$/.test(posix(relativePath))) {
      hints.push({
        filePath: path.join(projectRoot, relativePath),
        relativePath,
        reason: basename === "main.rs" ? "Cargo binary crate root" : "Cargo src/bin target",
        confidence: 1,
      });
      continue;
    }
    try {
      const tree = newParser().parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
      let hasMain = false;
      walk(tree.rootNode, (node) => {
        if (node.type === "function_item" && node.childForFieldName("name")?.text === "main")
          hasMain = true;
      });
      if (hasMain)
        hints.push({
          filePath: path.join(projectRoot, relativePath),
          relativePath,
          reason: "Rust main function",
          confidence: 0.95,
        });
    } catch {
      // Normal parsing preserves diagnostics.
    }
  }
  return hints;
}

function cargoMetadata(projectRoot: string, files: string[]): FrameworkMetadata[] {
  const manifestsFound = new Set<string>();
  for (const file of files) {
    let directory = path.dirname(path.join(projectRoot, file));
    while (directory.startsWith(path.resolve(projectRoot))) {
      const manifest = path.join(directory, "Cargo.toml");
      if (fs.existsSync(manifest)) manifestsFound.add(manifest);
      if (directory === path.resolve(projectRoot)) break;
      directory = path.dirname(directory);
    }
  }
  const packages = [...manifestsFound]
    .map(readCargo)
    .filter((value): value is CargoPackage => Boolean(value));
  if (!packages.length) return [];
  return [
    {
      frameworkName: packages.some((item) => item.workspaceMembers.length)
        ? "Cargo workspace"
        : "Cargo",
      metadata: {
        buildSystem: "cargo",
        manifests: packages.map((item) => posix(path.relative(projectRoot, item.manifest))).sort(),
        packages: packages
          .filter((item) => item.name)
          .map((item) => item.name)
          .sort(),
        workspaceMembers: [...new Set(packages.flatMap((item) => item.workspaceMembers))].sort(),
      },
    },
  ];
}

export class RustLanguagePlugin implements LanguagePlugin {
  id = "cascade-language-rust";
  name = "Cascade Rust Language Plugin";
  version = "2.3.0";
  supportedExtensions = [".rs"];
  fileDetectionRules = [
    { type: "extension" as const, pattern: ".rs" },
    { type: "filename" as const, pattern: "Cargo.toml" },
    { type: "filename" as const, pattern: "Cargo.lock" },
  ];
  analysisLevels = [
    "file-dependency",
    "module-dependency",
    "symbol-dependency",
    "build-dependency",
    "runtime-dynamic-dependency",
  ] as const;
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
      "cfg and cfg_attr predicates are preserved in source but not evaluated against a target triple or feature set.",
      "Macro expansion and procedural macros require rustc and are not expanded by the file-level analyzer.",
      "A workspace crate resolves to its crate root; Cargo target selection is metadata-based.",
      "Glob imports are file/module edges and do not claim symbol ownership.",
    ],
    unsupportedFeatures: [
      "Semantic name resolution after macro expansion",
      "Build-script emitted rerun, link, and generated-source relationships unless represented by literal includes",
      "Runtime library loading and non-literal include paths",
    ],
  };
  parser = { parse: parseRust };
  dependencyExtractor = {
    extractDependencies(context: ExtractionContext) {
      return extractRustDependencies(context.relativePath, context.content, context.ast);
    },
  };
  symbolExtractor = { extractSymbols: symbols };
  moduleResolver = { resolveModule: resolveRust };
  entryPointHints = { detectEntryPoints: entryPoints };
  testFileDetector = {
    isTestFile(_filePath: string, relativePath: string) {
      const normalized = posix(relativePath);
      return (
        /(?:^|\/)tests\/.*\.rs$/.test(normalized) || /(?:^|\/)benches\/.*\.rs$/.test(normalized)
      );
    },
  };
  generatedFileDetector = {
    isGeneratedFile(_filePath: string, relativePath: string, content?: string) {
      return (
        /(?:^|\/)(?:target|generated|gen|vendor)\/|(?:^|\/)src\/generated\//.test(
          posix(relativePath)
        ) || /@generated|automatically generated|DO NOT EDIT/i.test((content ?? "").slice(0, 1000))
      );
    },
  };
  configFileDetector = {
    isConfigFile(_filePath: string, relativePath: string) {
      return /(?:^|\/)(?:Cargo\.toml|Cargo\.lock|rust-toolchain(?:\.toml)?|\.cargo\/config(?:\.toml)?)$/.test(
        posix(relativePath)
      );
    },
  };
  frameworkMetadata = { detectMetadata: cargoMetadata };
}

export function createRustPlugin(): LanguagePlugin {
  return new RustLanguagePlugin();
}

export default createRustPlugin;
