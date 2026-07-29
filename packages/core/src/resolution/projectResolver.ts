import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  ExtractedDependency,
  ParseDiagnostic,
  ResolvedModuleResult,
} from "@cascade-code/plugin-api";
import { CascadeConfig } from "@cascade-code/config";
import { toPosixRelativePath } from "../utils/pathUtils.js";

const CODE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".d.ts",
  ".d.mts",
  ".d.cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
];

interface WorkspaceTarget {
  root: string;
  manifest: Record<string, unknown>;
}

export class ProjectModuleResolver {
  private readonly known = new Map<string, string>();
  private readonly lowerKnown = new Map<string, string[]>();
  private readonly cache = new Map<string, ResolvedModuleResult>();
  private readonly workspaces = new Map<string, WorkspaceTarget>();
  private readonly compilerOptions: ts.CompilerOptions;
  private readonly aliases: Record<string, string>;
  private readonly caseSensitive: boolean;

  constructor(
    private readonly projectRoot: string,
    knownRelativeFiles: string[],
    private readonly config: CascadeConfig
  ) {
    for (const relative of knownRelativeFiles) {
      const normalized = normalize(relative);
      this.known.set(normalized, normalized);
      const lower = normalized.toLowerCase();
      this.lowerKnown.set(lower, [...(this.lowerKnown.get(lower) ?? []), normalized]);
    }
    this.caseSensitive = config.caseSensitiveResolution ?? ts.sys.useCaseSensitiveFileNames;
    this.compilerOptions = this.loadCompilerOptions();
    this.aliases = { ...this.loadStaticAliases(), ...(config.pathAliases ?? {}) };
    this.discoverWorkspacePackages();
  }

  resolve(
    specifier: string,
    importerFilePath: string,
    importerRelativePath: string,
    dependency: ExtractedDependency
  ): ResolvedModuleResult {
    const key = `${importerRelativePath}\0${specifier}\0${dependency.isTypeOnly}`;
    const cached = this.cache.get(key);
    if (cached) return cached;

    const result = this.resolveUncached(
      specifier,
      importerFilePath,
      importerRelativePath,
      dependency
    );
    this.cache.set(key, result);
    return result;
  }

  private resolveUncached(
    specifier: string,
    importerFilePath: string,
    importerRelativePath: string,
    dependency: ExtractedDependency
  ): ResolvedModuleResult {
    const aliased = this.applyAlias(specifier);
    const direct = this.resolveFileLike(aliased, importerFilePath);
    if (direct) return direct;

    const workspace = this.resolveWorkspace(aliased);
    if (workspace) return workspace;

    const compilerResult = ts.resolveModuleName(
      aliased,
      importerFilePath,
      this.compilerOptions,
      ts.sys
    ).resolvedModule;
    if (compilerResult) {
      const absolute = path.resolve(compilerResult.resolvedFileName);
      if (!absolute.includes(`${path.sep}node_modules${path.sep}`)) {
        const known = this.matchKnown(toPosixRelativePath(absolute, this.projectRoot));
        if (known.status === "resolved") return known.result;
      }
      return {
        resolutionStatus: "external",
        confidence: 1,
        resolverId: "typescript-node-module-resolver",
      };
    }

    const isBare = !aliased.startsWith(".") && !path.isAbsolute(aliased);
    const isWorkspaceSpecifier = this.workspacePackageName(aliased) !== undefined;
    if (isBare && !isWorkspaceSpecifier && !aliased.startsWith("#")) {
      return {
        resolutionStatus: "external",
        confidence: 0.98,
        resolverId: "external-package-classifier",
      };
    }

    const diagnostic: ParseDiagnostic = {
      file: importerRelativePath,
      message: `Unable to resolve '${specifier}' from '${importerRelativePath}'`,
      severity: "warning",
      code: "UNRESOLVED_IMPORT",
      location: dependency.sourceLocation,
    };
    return {
      resolutionStatus: "unresolved",
      confidence: 0,
      resolverId: "project-module-resolver",
      diagnostics: [diagnostic],
    };
  }

  private resolveFileLike(specifier: string, importer: string): ResolvedModuleResult | undefined {
    if (!specifier.startsWith(".") && !path.isAbsolute(specifier)) return undefined;
    const base = path.isAbsolute(specifier)
      ? specifier
      : path.resolve(path.dirname(importer), specifier);
    return this.resolveCandidateBase(base);
  }

  private resolveCandidateBase(base: string): ResolvedModuleResult | undefined {
    const candidates = [base, ...CODE_EXTENSIONS.map((ext) => base + ext)];
    const assetExtensions = this.config.assetExtensions ?? [];
    candidates.push(...assetExtensions.map((ext) => base + ext));
    for (const ext of [...CODE_EXTENSIONS, ...assetExtensions]) {
      candidates.push(path.join(base, `index${ext}`));
    }

    if (safeIsDirectory(base)) {
      const manifest = readJson(path.join(base, "package.json"));
      for (const target of packageEntryTargets(manifest, this.config.conditions ?? [])) {
        candidates.unshift(path.resolve(base, target));
      }
    }

    for (const candidate of candidates) {
      const relative = toPosixRelativePath(candidate, this.projectRoot);
      const match = this.matchKnown(relative);
      if (match.status === "resolved" || match.status === "ambiguous") return match.result;
    }
    return undefined;
  }

  private matchKnown(
    relative: string
  ): { status: "missing" } | { status: "resolved" | "ambiguous"; result: ResolvedModuleResult } {
    const normalized = normalize(relative);
    if (this.known.has(normalized)) {
      return {
        status: "resolved",
        result: {
          resolvedFilePath: path.resolve(this.projectRoot, normalized),
          resolvedRelativePath: normalized,
          resolutionStatus: "resolved",
          confidence: 1,
          resolverId: "project-file-resolver",
        },
      };
    }
    const insensitive = this.lowerKnown.get(normalized.toLowerCase()) ?? [];
    if (!this.caseSensitive && insensitive.length === 1) {
      return {
        status: "resolved",
        result: {
          resolvedFilePath: path.resolve(this.projectRoot, insensitive[0]),
          resolvedRelativePath: insensitive[0],
          resolutionStatus: "resolved",
          confidence: 0.95,
          resolverId: "case-insensitive-file-resolver",
        },
      };
    }
    if (insensitive.length > 0) {
      return {
        status: "ambiguous",
        result: {
          resolutionStatus: "ambiguous",
          confidence: 0,
          resolverId: "case-sensitive-file-resolver",
          diagnostics: [
            {
              file: normalized,
              message: `Import casing does not match on-disk path: ${insensitive.join(", ")}`,
              severity: "warning",
              code: "IMPORT_CASE_MISMATCH",
            },
          ],
        },
      };
    }
    return { status: "missing" };
  }

  private applyAlias(specifier: string): string {
    for (const [pattern, target] of Object.entries(this.aliases)) {
      const star = pattern.indexOf("*");
      if (star >= 0) {
        const prefix = pattern.slice(0, star);
        const suffix = pattern.slice(star + 1);
        if (specifier.startsWith(prefix) && specifier.endsWith(suffix)) {
          const capture = specifier.slice(prefix.length, specifier.length - suffix.length);
          return path.resolve(this.projectRoot, target.replace("*", capture));
        }
      } else if (specifier === pattern || specifier.startsWith(`${pattern}/`)) {
        return path.resolve(
          this.projectRoot,
          target,
          specifier === pattern ? "" : specifier.slice(pattern.length + 1)
        );
      }
    }
    return specifier;
  }

  private resolveWorkspace(specifier: string): ResolvedModuleResult | undefined {
    const name = this.workspacePackageName(specifier);
    if (!name) return undefined;
    const workspace = this.workspaces.get(name)!;
    const subpath = specifier.slice(name.length).replace(/^\//, "");
    if (subpath) {
      const exportKey = `./${subpath}`;
      const mapped = workspace.manifest.exports;
      if (mapped && typeof mapped === "object" && exportKey in mapped) {
        for (const target of collectConditionalTargets(
          (mapped as Record<string, unknown>)[exportKey],
          this.config.conditions ?? []
        )) {
          const resolved = this.resolveCandidateBase(path.resolve(workspace.root, target));
          if (resolved) return { ...resolved, resolverId: "workspace-exports-resolver" };
        }
      }
      return this.resolveCandidateBase(path.join(workspace.root, subpath));
    }
    for (const target of packageEntryTargets(workspace.manifest, this.config.conditions ?? [])) {
      const resolved = this.resolveCandidateBase(path.resolve(workspace.root, target));
      if (resolved) {
        return { ...resolved, resolverId: "workspace-package-resolver" };
      }
    }
    return (
      this.resolveCandidateBase(path.join(workspace.root, "src/index")) ??
      this.resolveCandidateBase(path.join(workspace.root, "index"))
    );
  }

  private workspacePackageName(specifier: string): string | undefined {
    return [...this.workspaces.keys()]
      .sort((a, b) => b.length - a.length)
      .find((name) => specifier === name || specifier.startsWith(`${name}/`));
  }

  private loadCompilerOptions(): ts.CompilerOptions {
    const configPath = ts.findConfigFile(this.projectRoot, ts.sys.fileExists);
    if (!configPath) {
      return {
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        module: ts.ModuleKind.NodeNext,
        resolveJsonModule: true,
        allowJs: true,
      };
    }
    const read = ts.readConfigFile(configPath, ts.sys.readFile);
    if (read.error) return {};
    return ts.parseJsonConfigFileContent(read.config, ts.sys, path.dirname(configPath)).options;
  }

  private discoverWorkspacePackages(): void {
    for (const relative of this.known.keys()) {
      if (path.posix.basename(relative) !== "package.json") continue;
      const absolute = path.resolve(this.projectRoot, relative);
      const manifest = readJson(absolute);
      if (typeof manifest?.name === "string") {
        this.workspaces.set(manifest.name, { root: path.dirname(absolute), manifest });
      }
    }
    const rootManifest = readJson(path.join(this.projectRoot, "package.json"));
    if (typeof rootManifest?.name === "string") {
      this.workspaces.set(rootManifest.name, { root: this.projectRoot, manifest: rootManifest });
    }
  }

  private loadStaticAliases(): Record<string, string> {
    const aliases: Record<string, string> = {};
    const tsconfig = readJson(
      ts.findConfigFile(this.projectRoot, ts.sys.fileExists) ??
        path.join(this.projectRoot, "tsconfig.json")
    );
    const baseUrl = tsconfig?.compilerOptions?.baseUrl ?? ".";
    for (const [key, values] of Object.entries(tsconfig?.compilerOptions?.paths ?? {})) {
      const first = Array.isArray(values) ? values[0] : undefined;
      if (typeof first === "string") aliases[key] = path.join(baseUrl, first);
    }
    for (const configName of [
      "vite.config.ts",
      "vite.config.js",
      "webpack.config.js",
      "next.config.js",
    ]) {
      const filePath = path.join(this.projectRoot, configName);
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, "utf-8");
      const aliasPattern =
        /(?:find\s*:\s*|['"])([@#~][\w/-]*)['"]?\s*[,=:]\s*(?:path\.resolve\([^,]+,\s*)?['"]([^'"]+)['"]/g;
      let match: RegExpExecArray | null;
      while ((match = aliasPattern.exec(content))) aliases[match[1]] = match[2];
    }
    return aliases;
  }
}

function normalize(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function safeIsDirectory(value: string): boolean {
  try {
    return fs.statSync(value).isDirectory();
  } catch {
    return false;
  }
}

// Package and tool configuration files are intentionally open-ended JSON.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readJson(filePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return undefined;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function packageEntryTargets(manifest: any, conditions: string[]): string[] {
  if (!manifest) return [];
  const targets: string[] = [];
  const collect = (value: unknown): void => {
    if (typeof value === "string") targets.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === "object") {
      for (const condition of [...conditions, "types", "import", "require", "default"]) {
        if (condition in value) collect((value as Record<string, unknown>)[condition]);
      }
      if ("." in value) collect((value as Record<string, unknown>)["."]);
    }
  };
  collect(manifest.exports);
  for (const field of ["types", "typings", "module", "browser", "main"]) collect(manifest[field]);
  return [...new Set(targets)];
}

function collectConditionalTargets(value: unknown, conditions: string[]): string[] {
  const targets: string[] = [];
  const collect = (current: unknown): void => {
    if (typeof current === "string") targets.push(current);
    else if (Array.isArray(current)) current.forEach(collect);
    else if (current && typeof current === "object") {
      for (const condition of [...conditions, "types", "import", "require", "default"]) {
        if (condition in current) collect((current as Record<string, unknown>)[condition]);
      }
    }
  };
  collect(value);
  return [...new Set(targets)];
}
