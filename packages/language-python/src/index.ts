import fs from "node:fs";
import path from "node:path";
import type {
  DependencyExtractionResult,
  EntryPointHint,
  ExtractedDependency,
  LanguagePlugin,
  ParseDiagnostic,
  ResolutionContext,
  ResolvedModuleResult,
  SourceLocation,
  SymbolDeclaration,
} from "@cascade-code/plugin-api";

const STDLIB = new Set(
  "abc argparse asyncio ast base64 builtins collections concurrent contextlib csv dataclasses datetime decimal enum functools glob hashlib http importlib inspect io itertools json logging math multiprocessing os pathlib pickle platform queue random re shutil signal socket sqlite3 statistics string subprocess sys tempfile threading time traceback types typing unittest urllib uuid warnings weakref xml zipfile zoneinfo".split(
    " "
  )
);

type PythonAst = { lines: string[]; diagnostics: ParseDiagnostic[] };

function location(line: number, text: string): SourceLocation {
  return { startLine: line, startColumn: 1, endLine: line, endColumn: text.length + 1 };
}

/** Conservative structural parser. It preserves malformed-source diagnostics while extraction remains useful. */
function parsePython(relativePath: string, content: string): PythonAst {
  const lines = content.split(/\r?\n/);
  const diagnostics: ParseDiagnostic[] = [];
  const stack: string[] = [];
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  let quote: string | undefined;
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const previous = content[i - 1];
    if (quote) {
      if (char === quote && previous !== "\\") quote = undefined;
      continue;
    }
    if (char === "'" || char === '"') quote = char;
    else if ("([{".includes(char)) stack.push(char);
    else if (")]}".includes(char) && stack.pop() !== pairs[char]) {
      diagnostics.push({
        file: relativePath,
        message: "Unbalanced delimiter; dependency extraction is partial.",
        severity: "error",
        code: "PY_PARSE_ERROR",
      });
      break;
    }
  }
  if (quote || stack.length) {
    diagnostics.push({
      file: relativePath,
      message: "Unterminated string or delimiter; dependency extraction is partial.",
      severity: "error",
      code: "PY_PARSE_ERROR",
    });
  }
  return { lines, diagnostics };
}

function extractPython(relativePath: string, content: string): DependencyExtractionResult {
  const dependencies: ExtractedDependency[] = [];
  const diagnostics: ParseDiagnostic[] = [];
  const lines = content.split(/\r?\n/);
  const blocks: Array<{
    indent: number;
    typeOnly: boolean;
    conditional: boolean;
    function: boolean;
  }> = [];

  const add = (
    specifier: string,
    line: number,
    rawText: string,
    dynamic = false,
    importedNames?: string[]
  ) => {
    const active = blocks.filter((block) => block.indent < rawText.search(/\S|$/));
    const typeOnly = active.some((block) => block.typeOnly);
    const conditional = active.some((block) => block.conditional || block.function);
    dependencies.push({
      specifier,
      importKind: typeOnly
        ? "type-only"
        : dynamic
          ? "dynamic"
          : conditional
            ? "conditional"
            : "static",
      isStatic: !dynamic,
      isDynamic: dynamic,
      isTypeOnly: typeOnly,
      isReExport: false,
      isConditional: conditional,
      sourceLocation: location(line, rawText),
      rawText,
      importedNames,
      confidence: importedNames?.includes("*") ? 0.75 : 1,
      evidence: [
        typeOnly
          ? "guarded by TYPE_CHECKING"
          : conditional
            ? "conditional or local import"
            : "AST-like static import",
      ],
    });
  };

  lines.forEach((raw, index) => {
    const indent = raw.search(/\S|$/);
    while (blocks.length && blocks[blocks.length - 1].indent >= indent && raw.trim()) blocks.pop();
    const trimmed = raw.trim();
    if (/^(async\s+)?def\s+/.test(trimmed))
      blocks.push({ indent, typeOnly: false, conditional: false, function: true });
    else if (/^if\s+.*TYPE_CHECKING.*:/.test(trimmed))
      blocks.push({ indent, typeOnly: true, conditional: true, function: false });
    else if (/^(if|try|except|elif|else|match|case)\b.*:/.test(trimmed))
      blocks.push({ indent, typeOnly: false, conditional: true, function: false });

    const importMatch = /^import\s+(.+?)(?:\s*#.*)?$/.exec(trimmed);
    if (importMatch) {
      for (const item of importMatch[1].split(","))
        add(item.trim().split(/\s+as\s+/)[0], index + 1, raw);
    }
    const fromMatch = /^from\s+([.\w]+)\s+import\s+(.+?)(?:\s*#.*)?$/.exec(trimmed);
    if (fromMatch) {
      const names = fromMatch[2]
        .replace(/[()]/g, "")
        .split(",")
        .map((name) => name.trim().split(/\s+as\s+/)[0])
        .filter(Boolean);
      add(fromMatch[1], index + 1, raw, false, names);
      if (names.includes("*")) {
        diagnostics.push({
          file: relativePath,
          message: `Star import from '${fromMatch[1]}' cannot provide symbol-level certainty.`,
          severity: "warning",
          code: "PY_STAR_IMPORT",
          location: location(index + 1, raw),
        });
      }
    }
    const literalDynamic = /(?:importlib\.import_module|__import__)\(\s*(['"])([^'"]+)\1\s*\)/g;
    let match: RegExpExecArray | null;
    while ((match = literalDynamic.exec(raw))) add(match[2], index + 1, raw, true);
    if (
      /(?:importlib\.import_module|__import__)\s*\(/.test(raw) &&
      !/(?:importlib\.import_module|__import__)\(\s*(['"])[^'"]+\1\s*\)/.test(raw)
    ) {
      diagnostics.push({
        file: relativePath,
        message: "Dynamic import target is not a string literal and cannot be resolved statically.",
        severity: "warning",
        code: "PY_DYNAMIC_IMPORT_UNRESOLVED",
        location: location(index + 1, raw),
      });
    }
  });
  return { dependencies, diagnostics };
}

function moduleCandidates(file: string): string[] {
  const normalized = file.replace(/\\/g, "/");
  const withoutExt = normalized.replace(/\.pyi?$/, "");
  const candidates = new Set([withoutExt.replace(/\/__init__$/, "").replace(/\//g, ".")]);
  const src = withoutExt.match(/(?:^|\/)src\/(.+)$/);
  if (src) candidates.add(src[1].replace(/\/__init__$/, "").replace(/\//g, "."));
  return [...candidates];
}

function resolvePython(context: ResolutionContext): ResolvedModuleResult {
  const files = context.allKnownFiles.filter((file) => /\.pyi?$/.test(file));
  const index = new Map<string, string[]>();
  for (const file of files)
    for (const moduleName of moduleCandidates(file))
      index.set(moduleName, [...(index.get(moduleName) ?? []), file]);

  let moduleName = context.specifier;
  if (moduleName.startsWith(".")) {
    const dots = moduleName.match(/^\.+/)?.[0].length ?? 0;
    const importer = context.importerRelativePath.replace(/\.pyi?$/, "").split("/");
    importer.pop();
    const base = importer.slice(0, Math.max(0, importer.length - dots + 1));
    moduleName = [...base, moduleName.slice(dots)].filter(Boolean).join(".");
    const srcIndex = moduleName.indexOf("src.");
    if (srcIndex >= 0) moduleName = moduleName.slice(srcIndex + 4);
  }
  const importedNames = context.extractedDependency.importedNames ?? [];
  const candidateNames = [
    ...importedNames.filter((name) => name !== "*").map((name) => `${moduleName}.${name}`),
    moduleName,
  ];
  const matches = candidateNames.flatMap((name) => index.get(name) ?? []);
  if (matches.length === 1)
    return {
      resolvedFilePath: path.join(context.projectRoot, matches[0]),
      resolvedRelativePath: matches[0],
      resolutionStatus: "resolved",
      confidence: context.extractedDependency.confidence ?? 1,
      resolverId: "python-module-index",
      dependencyCategory: "internal",
      evidence: [`matched Python module '${moduleName}'`],
    };
  if (matches.length > 1)
    return {
      resolutionStatus: "ambiguous",
      confidence: 0.5,
      resolverId: "python-module-index",
      dependencyCategory: "internal",
      evidence: matches.map((match) => `candidate: ${match}`),
    };
  const top = moduleName.split(".")[0];
  if (STDLIB.has(top))
    return {
      resolutionStatus: "external",
      confidence: 0.98,
      resolverId: "python-stdlib",
      dependencyCategory: "standard-library",
      evidence: [`'${top}' is in the configured Python standard-library index`],
    };
  if (
    !context.specifier.startsWith(".") &&
    declaredDistributions(context.projectRoot).has(top.replace(/_/g, "-"))
  )
    return {
      resolutionStatus: "external",
      confidence: 0.7,
      resolverId: "python-third-party",
      dependencyCategory: "external",
      evidence: ["module is declared in Python packaging or requirements metadata"],
    };
  return {
    resolutionStatus: "unresolved",
    confidence: 0,
    resolverId: "python-module-index",
    dependencyCategory: "unresolved",
    diagnostics: [
      {
        file: context.importerRelativePath,
        message: `Unable to resolve Python import '${context.specifier}'.`,
        severity: "warning",
        code: "PY_UNRESOLVED_IMPORT",
      },
    ],
  };
}

function declaredDistributions(projectRoot: string): Set<string> {
  const result = new Set<string>();
  const manifests = ["pyproject.toml", "requirements.txt", "requirements-dev.txt", "setup.cfg"];
  for (const name of manifests) {
    try {
      const content = fs.readFileSync(path.join(projectRoot, name), "utf8");
      for (const match of content.matchAll(
        /(?:^|["'\s,])([A-Za-z][\w.-]+)\s*(?:[<>=!~;\]"]|$)/gm
      )) {
        result.add(match[1].toLowerCase().replace(/_/g, "-"));
      }
    } catch {
      // Optional packaging metadata.
    }
  }
  return result;
}

export class PythonLanguagePlugin implements LanguagePlugin {
  id = "cascade-language-python";
  name = "Cascade Python Language Plugin";
  version = "3.3.0";
  supportedExtensions = [".py", ".pyi"];
  fileDetectionRules = [
    { type: "extension" as const, pattern: ".py" },
    { type: "extension" as const, pattern: ".pyi" },
    { type: "shebang" as const, pattern: "#!/usr/bin/env python" },
  ];
  capabilities = {
    astParsing: true,
    symbolExtraction: true,
    dynamicDependencies: true,
    reExports: false,
    typeOnlyDependencies: true,
    moduleResolution: true,
    entryPointDetection: true,
    testFileDetection: true,
    generatedFileDetection: true,
    crossLanguageEdges: false,
  };
  limitations = {
    knownIssues: [
      "Non-literal dynamic imports are reported but not resolved",
      "Third-party classification is conservative when packaging metadata is absent",
    ],
    unsupportedFeatures: [
      "Runtime import hooks and arbitrary sys.path mutation",
      "Jupyter notebook cells unless exported to Python",
    ],
  };
  analysisLevels = [
    "file-dependency",
    "module-dependency",
    "symbol-dependency",
    "build-dependency",
    "runtime-dynamic-dependency",
  ] as const;
  parser = {
    parse: ({ relativePath, content }: { relativePath: string; content: string }) => {
      const ast = parsePython(relativePath, content);
      return {
        ast,
        status: ast.diagnostics.length ? ("partial" as const) : ("success" as const),
        diagnostics: ast.diagnostics,
      };
    },
  };
  dependencyExtractor = {
    extractDependencies: ({ relativePath, content }: { relativePath: string; content: string }) =>
      extractPython(relativePath, content),
  };
  moduleResolver = { resolveModule: resolvePython };
  symbolExtractor = {
    extractSymbols: ({ relativePath, content }: { relativePath: string; content: string }) => {
      const declarations: SymbolDeclaration[] = [];
      for (const [index, line] of content.split(/\r?\n/).entries()) {
        const match = /^(?:async\s+)?(def|class)\s+([A-Za-z_]\w*)/.exec(line.trim());
        if (match)
          declarations.push({
            id: `${relativePath}#${match[2]}`,
            name: match[2],
            kind: match[1] === "class" ? "class" : "function",
            exported: !match[2].startsWith("_"),
            location: location(index + 1, line),
          });
      }
      return { declarations, references: [], diagnostics: [] };
    },
  };
  entryPointHints = {
    detectEntryPoints(projectRoot: string, files: string[]): EntryPointHint[] {
      return files.flatMap((file) => {
        const name = path.posix.basename(file);
        let reason: string | undefined;
        let confidence = 0.85;
        if (name === "__main__.py") {
          reason = "Python package __main__ entry point";
          confidence = 1;
        } else if (name === "manage.py") {
          reason = "Django management entry point";
          confidence = 0.98;
        } else if (/^(main|app|server|asgi|wsgi)\.py$/.test(name)) {
          reason = "Python application entry-point convention";
        } else {
          try {
            if (
              fs
                .readFileSync(path.join(projectRoot, file), "utf8")
                .includes('if __name__ == "__main__"')
            )
              reason = "Python __main__ guard";
          } catch {
            return [];
          }
        }
        return reason
          ? [{ filePath: path.join(projectRoot, file), relativePath: file, reason, confidence }]
          : [];
      });
    },
  };
  testFileDetector = {
    isTestFile: (_filePath: string, relativePath: string) =>
      /(^|\/)(test_[^/]+|[^/]+_test)\.pyi?$/i.test(relativePath) ||
      /(^|\/)tests?\//i.test(relativePath),
  };
  generatedFileDetector = {
    isGeneratedFile: (_filePath: string, relativePath: string, content?: string) =>
      /(?:_pb2(?:_grpc)?\.py|\/migrations\/\d+_.+\.py)$/i.test(relativePath) ||
      /(@generated|auto-generated|generated by)/i.test(content ?? ""),
  };
}

export const createPythonPlugin = () => new PythonLanguagePlugin();
export { extractPython as extractPythonDependencies };
