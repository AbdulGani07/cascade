import fs from "node:fs";
import path from "node:path";
import Parser from "tree-sitter";
import CSharp from "tree-sitter-c-sharp";
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

type SyntaxNode = Parser.SyntaxNode;

const parser = new Parser();
parser.setLanguage(CSharp as unknown as Parser.Language);
const sourceFactCache = new Map<
  string,
  { modified: number; facts: { namespaces: string[]; types: string[] } }
>();

function parseTree(content: string): Parser.Tree {
  return parser.parse(content);
}

function walk(node: SyntaxNode, visit: (node: SyntaxNode) => void): void {
  visit(node);
  for (const child of node.namedChildren) walk(child, visit);
}

function location(node: SyntaxNode): SourceLocation {
  return {
    startLine: node.startPosition.row + 1,
    startColumn: node.startPosition.column + 1,
    endLine: node.endPosition.row + 1,
    endColumn: node.endPosition.column + 1,
  };
}

function parseDiagnostics(relativePath: string, tree: Parser.Tree): ParseDiagnostic[] {
  const diagnostics: ParseDiagnostic[] = [];
  walk(tree.rootNode, (node) => {
    if (node.type !== "ERROR" && !node.isMissing) return;
    diagnostics.push({
      file: relativePath,
      message: node.isMissing
        ? `Missing ${node.type} in C# syntax.`
        : "C# parser recovered from malformed syntax.",
      severity: "error",
      code: "CS_PARSE_ERROR",
      location: location(node),
    });
  });
  return diagnostics;
}

function usingSpecifier(text: string): { specifier?: string; alias?: string; isStatic: boolean } {
  const normalized = text
    .replace(/^global\s+/, "")
    .replace(/^using\s+/, "")
    .replace(/;\s*$/, "")
    .trim();
  if (normalized.startsWith("static ")) {
    return { specifier: normalized.slice(7).trim(), isStatic: true };
  }
  const equals = normalized.indexOf("=");
  if (equals >= 0) {
    return {
      alias: normalized.slice(0, equals).trim(),
      specifier: normalized.slice(equals + 1).trim(),
      isStatic: false,
    };
  }
  return { specifier: normalized, isStatic: false };
}

export function extractCSharpDependencies(
  relativePath: string,
  content: string,
  suppliedTree?: Parser.Tree
): DependencyExtractionResult {
  const tree = suppliedTree ?? parseTree(content);
  const dependencies: DependencyExtractionResult["dependencies"] = [];
  const seenReferences = new Set<string>();
  walk(tree.rootNode, (node) => {
    if (node.type === "using_directive") {
      const rawText = node.text;
      const parsed = usingSpecifier(rawText);
      if (!parsed.specifier) return;
      dependencies.push({
        specifier: parsed.specifier.replace(/^global::/, ""),
        importKind: "static",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
        sourceLocation: location(node),
        rawText,
        confidence: 0.98,
        evidence: [
          parsed.isStatic
            ? "Tree-sitter static using directive"
            : parsed.alias
              ? `Tree-sitter using alias '${parsed.alias}'`
              : rawText.startsWith("global")
                ? "Tree-sitter global using directive"
                : "Tree-sitter using directive",
        ],
      });
      return;
    }
    if (node.type !== "object_creation_expression") return;
    const typeNode = node.childForFieldName("type");
    if (!typeNode) return;
    const specifier = typeNode?.text.replace(/^global::/, "");
    if (!specifier?.includes(".") || seenReferences.has(specifier)) return;
    seenReferences.add(specifier);
    dependencies.push({
      specifier,
      importKind: "reference",
      isStatic: true,
      isDynamic: false,
      isTypeOnly: false,
      isReExport: false,
      isConditional: false,
      sourceLocation: location(typeNode),
      rawText: typeNode.text,
      confidence: 0.88,
      evidence: ["Tree-sitter fully qualified object-creation type"],
    });
  });
  return { dependencies, diagnostics: parseDiagnostics(relativePath, tree) };
}

function namespaceAndTypes(content: string): { namespaces: string[]; types: string[] } {
  const tree = parseTree(content);
  const namespaces = new Set<string>();
  const types = new Set<string>();
  walk(tree.rootNode, (node) => {
    if (
      node.type === "namespace_declaration" ||
      node.type === "file_scoped_namespace_declaration"
    ) {
      const name = node.childForFieldName("name");
      if (name) namespaces.add(name.text.replace(/^global::/, ""));
    }
    if (
      [
        "class_declaration",
        "struct_declaration",
        "interface_declaration",
        "enum_declaration",
        "record_declaration",
      ].includes(node.type)
    ) {
      const name = node.childForFieldName("name");
      if (name) types.add(name.text);
    }
  });
  return { namespaces: [...namespaces], types: [...types] };
}

function cachedNamespaceAndTypes(file: string): { namespaces: string[]; types: string[] } {
  const modified = fs.statSync(file).mtimeMs;
  const cached = sourceFactCache.get(file);
  if (cached?.modified === modified) return cached.facts;
  const facts = namespaceAndTypes(fs.readFileSync(file, "utf8"));
  sourceFactCache.set(file, { modified, facts });
  return facts;
}

function findBuildFiles(projectRoot: string, suffix: string): string[] {
  const found: string[] = [];
  const ignored = new Set([".git", "node_modules", "bin", "obj"]);
  const visit = (directory: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignored.has(entry.name)) continue;
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.name.toLowerCase().endsWith(suffix)) found.push(target);
    }
  };
  visit(projectRoot);
  return found;
}

function projectMetadata(projectRoot: string): {
  projectReferences: Set<string>;
  packages: Set<string>;
  assemblies: Set<string>;
} {
  const projectReferences = new Set<string>();
  const packages = new Set<string>();
  const assemblies = new Set<string>();
  for (const projectFile of findBuildFiles(projectRoot, ".csproj")) {
    const xml = fs.readFileSync(projectFile, "utf8");
    for (const match of xml.matchAll(/<ProjectReference\s+Include=["']([^"']+)["']/gi))
      projectReferences.add(path.resolve(path.dirname(projectFile), match[1]));
    for (const match of xml.matchAll(/<PackageReference\s+Include=["']([^"']+)["']/gi))
      packages.add(match[1].split(".")[0].toLowerCase());
    for (const match of xml.matchAll(/<Reference\s+Include=["']([^"',]+)[^"']*["']/gi))
      assemblies.add(match[1].split(".")[0].toLowerCase());
  }
  return { projectReferences, packages, assemblies };
}

function resolveCSharp(context: ResolutionContext): ResolvedModuleResult {
  const matches: string[] = [];
  const specifier = context.specifier.replace(/^global::/, "");
  for (const relativeFile of context.allKnownFiles.filter((file) => file.endsWith(".cs"))) {
    try {
      const facts = cachedNamespaceAndTypes(path.join(context.projectRoot, relativeFile));
      if (
        facts.namespaces.some(
          (namespace) =>
            namespace === specifier ||
            namespace.startsWith(`${specifier}.`) ||
            specifier.startsWith(`${namespace}.`)
        ) ||
        facts.types.some((type) => specifier.endsWith(`.${type}`))
      )
        matches.push(relativeFile);
    } catch {
      // A concurrent file deletion is reported as unresolved below.
    }
  }
  const unique = [...new Set(matches)];
  if (unique.length === 1) {
    const projectFiles = findBuildFiles(context.projectRoot, ".csproj");
    const containingProject = (sourceFile: string) =>
      projectFiles
        .filter((projectFile) =>
          path
            .resolve(sourceFile)
            .startsWith(`${path.dirname(path.resolve(projectFile))}${path.sep}`)
        )
        .sort((left, right) => right.length - left.length)[0];
    const importerProject = containingProject(context.importerFilePath);
    const targetProject = containingProject(path.join(context.projectRoot, unique[0]));
    const crossProject = importerProject && targetProject && importerProject !== targetProject;
    const importerReferencesTarget =
      crossProject &&
      [
        ...fs
          .readFileSync(importerProject, "utf8")
          .matchAll(/<ProjectReference\s+Include=["']([^"']+)["']/gi),
      ].some(
        (match) =>
          path.resolve(path.dirname(importerProject), match[1]) === path.resolve(targetProject)
      );
    if (crossProject && !importerReferencesTarget)
      return {
        resolutionStatus: "unresolved",
        confidence: 0.2,
        resolverId: "csharp-msbuild-reference",
        dependencyCategory: "unresolved",
        evidence: [`source declaration exists in unreferenced project ${targetProject}`],
        diagnostics: [
          {
            file: context.importerRelativePath,
            message: `Namespace '${specifier}' is declared in another project without a ProjectReference.`,
            severity: "warning",
            code: "CS_MISSING_PROJECT_REFERENCE",
          },
        ],
      };
    return {
      resolvedFilePath: path.join(context.projectRoot, unique[0]),
      resolvedRelativePath: unique[0],
      resolutionStatus: "resolved",
      confidence: 0.9,
      resolverId: "csharp-namespace-index",
      dependencyCategory: "internal",
      evidence: [
        `namespace/type '${specifier}' is declared by ${unique[0]}`,
        ...(importerReferencesTarget ? ["matching MSBuild ProjectReference is present"] : []),
      ],
    };
  }
  if (unique.length > 1)
    return {
      resolutionStatus: "ambiguous",
      confidence: 0.55,
      resolverId: "csharp-namespace-index",
      dependencyCategory: "internal",
      evidence: unique.map((file) => `matching namespace/type declaration: ${file}`),
      diagnostics: [
        {
          file: context.importerRelativePath,
          message: `Using '${specifier}' matches multiple source files.`,
          severity: "warning",
          code: "CS_AMBIGUOUS_NAMESPACE",
        },
      ],
    };

  const top = specifier.split(".")[0].toLowerCase();
  const metadata = projectMetadata(context.projectRoot);
  if (top === "system" || top === "microsoft")
    return {
      resolutionStatus: "external",
      confidence: 0.96,
      resolverId: "csharp-bcl",
      dependencyCategory: "standard-library",
      evidence: ["namespace belongs to the .NET base/framework namespace family"],
    };
  if (metadata.packages.has(top) || metadata.assemblies.has(top))
    return {
      resolutionStatus: "external",
      confidence: 0.82,
      resolverId: "csharp-msbuild-reference",
      dependencyCategory: "external",
      evidence: ["top-level namespace corresponds to PackageReference or Reference metadata"],
    };
  return {
    resolutionStatus: "unresolved",
    confidence: 0,
    resolverId: "csharp-namespace-index",
    dependencyCategory: "unresolved",
    evidence:
      metadata.projectReferences.size > 0
        ? ["project references were inspected but no matching source namespace was found"]
        : ["no source namespace, framework namespace, or MSBuild reference matched"],
    diagnostics: [
      {
        file: context.importerRelativePath,
        message: `Unable to resolve C# namespace or type '${specifier}'.`,
        severity: "warning",
        code: "CS_UNRESOLVED_NAMESPACE",
      },
    ],
  };
}

function isMainFile(
  file: string,
  content: string
): { reason: string; confidence: number } | undefined {
  const tree = parseTree(content);
  let hasMain = false;
  let hasTopLevelStatement = false;
  walk(tree.rootNode, (node) => {
    if (node.type === "method_declaration") {
      const name = node.childForFieldName("name");
      if (name?.text === "Main" && /\bstatic\b/.test(node.text)) hasMain = true;
    }
    if (node.parent?.type === "compilation_unit" && node.type === "global_statement")
      hasTopLevelStatement = true;
  });
  if (hasMain) return { reason: "C# static Main method", confidence: 1 };
  if (hasTopLevelStatement)
    return { reason: "C# top-level statements executable entry point", confidence: 0.98 };
  if (path.basename(file).toLowerCase() === "program.cs")
    return { reason: "Program.cs convention", confidence: 0.75 };
  return undefined;
}

function symbols(relativePath: string, content: string): SymbolExtractionResult {
  const declarations: SymbolDeclaration[] = [];
  const tree = parseTree(content);
  walk(tree.rootNode, (node) => {
    const kinds: Record<string, SymbolDeclaration["kind"]> = {
      class_declaration: "class",
      interface_declaration: "interface",
      enum_declaration: "enum",
      struct_declaration: "type",
      record_declaration: "type",
      method_declaration: "function",
    };
    const kind = kinds[node.type];
    const name = node.childForFieldName("name");
    if (!kind || !name) return;
    declarations.push({
      id: `${relativePath}#${name.text}`,
      name: name.text,
      kind,
      exported: /\bpublic\b/.test(node.text.slice(0, Math.min(node.text.length, 120))),
      location: location(name),
    });
  });
  return { declarations, references: [], diagnostics: parseDiagnostics(relativePath, tree) };
}

export class CSharpLanguagePlugin implements LanguagePlugin {
  id = "cascade-language-csharp";
  name = "Cascade C# Language Plugin";
  version = "3.0.0";
  supportedExtensions = [".cs"];
  fileDetectionRules = [{ type: "extension" as const, pattern: ".cs" }];
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
      "using directives identify namespace visibility, not guaranteed assembly load edges",
      "conditional MSBuild properties are recorded conservatively without evaluating every target framework",
    ],
    unsupportedFeatures: [
      "runtime reflection and dependency-injection registrations",
      "NuGet restore graph evaluation",
      "source-generator execution",
    ],
  };
  analysisLevels = [
    "file-dependency",
    "module-dependency",
    "symbol-dependency",
    "build-dependency",
  ] as const;

  parser = {
    parse(context: ParseContext): ParseResult {
      try {
        const tree = parseTree(context.content);
        const diagnostics = parseDiagnostics(context.relativePath, tree);
        return { ast: tree, status: diagnostics.length ? "partial" : "success", diagnostics };
      } catch (error) {
        return {
          status: "failed",
          diagnostics: [
            {
              file: context.relativePath,
              message: `C# parser failed: ${(error as Error).message}`,
              severity: "error",
              code: "CS_PARSER_FAILURE",
            },
          ],
        };
      }
    },
  };
  dependencyExtractor = {
    extractDependencies(context: ExtractionContext): DependencyExtractionResult {
      return extractCSharpDependencies(
        context.relativePath,
        context.content,
        context.ast as Parser.Tree | undefined
      );
    },
  };
  moduleResolver = { resolveModule: resolveCSharp };
  symbolExtractor = {
    extractSymbols(context: ExtractionContext): SymbolExtractionResult {
      return symbols(context.relativePath, context.content);
    },
  };
  entryPointHints = {
    detectEntryPoints(projectRoot: string, files: string[]): EntryPointHint[] {
      const hints: EntryPointHint[] = [];
      for (const relativePath of files.filter((file) => file.endsWith(".cs"))) {
        try {
          const detected = isMainFile(
            relativePath,
            fs.readFileSync(path.join(projectRoot, relativePath), "utf8")
          );
          if (detected)
            hints.push({
              filePath: path.join(projectRoot, relativePath),
              relativePath,
              ...detected,
            });
        } catch {
          // Scanner diagnostics own unreadable files.
        }
      }
      return hints;
    },
  };
  testFileDetector = {
    isTestFile(_filePath: string, relativePath: string): boolean {
      const normalized = relativePath.replace(/\\/g, "/");
      return (
        /(?:^|\/)(?:test|tests)(?:\/|$)/i.test(normalized) ||
        /\.(?:Tests?|Specs?)\.cs$/i.test(normalized)
      );
    },
  };
  generatedFileDetector = {
    isGeneratedFile(_filePath: string, relativePath: string, content?: string): boolean {
      const normalized = relativePath.replace(/\\/g, "/");
      return (
        /(?:^|\/)(?:obj|bin|Generated|GeneratedFiles)(?:\/|$)/i.test(normalized) ||
        /\.(?:g|g\.i|designer|generated)\.cs$/i.test(normalized) ||
        /<auto-generated(?:\s*\/>|>)/i.test(content?.slice(0, 1000) ?? "")
      );
    },
  };
  configFileDetector = {
    isConfigFile(_filePath: string, relativePath: string): boolean {
      return /\.(?:csproj|sln|props|targets)$/i.test(relativePath);
    },
  };
  frameworkMetadata = {
    detectMetadata(projectRoot: string, files: string[]) {
      const metadata = projectMetadata(projectRoot);
      const frameworks = [];
      const projectFiles = findBuildFiles(projectRoot, ".csproj");
      if (
        projectFiles.some((file) =>
          /Sdk=["']Microsoft\.NET\.Sdk\.Web["']|Microsoft\.AspNetCore/i.test(
            fs.readFileSync(file, "utf8")
          )
        )
      )
        frameworks.push({
          frameworkName: "ASP.NET Core",
          metadata: { projectFiles: projectFiles.map((file) => path.relative(projectRoot, file)) },
        });
      frameworks.push({
        frameworkName: "MSBuild",
        metadata: {
          solutionFiles: findBuildFiles(projectRoot, ".sln").map((file) =>
            path.relative(projectRoot, file)
          ),
          projectFiles: projectFiles.map((file) => path.relative(projectRoot, file)),
          projectReferences: [...metadata.projectReferences].map((file) =>
            path.relative(projectRoot, file)
          ),
          sourceFileCount: files.filter((file) => file.endsWith(".cs")).length,
        },
      });
      return frameworks;
    },
  };
}

export function createCSharpPlugin(): LanguagePlugin {
  return new CSharpLanguagePlugin();
}

export default createCSharpPlugin;
