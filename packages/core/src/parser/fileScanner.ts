import fs from "node:fs";
import path from "node:path";
import { minimatch } from "minimatch";
import { DependencyNode } from "@cascade-code/plugin-api";
import { CascadeConfig } from "@cascade-code/config";
import { PluginRegistry } from "../plugins/pluginRegistry.js";
import { toPosixRelativePath } from "../utils/pathUtils.js";

/**
 * Recursively scans project directory for files using PluginRegistry to match language plugins.
 */
export function scanFiles(
  projectRoot: string,
  config: CascadeConfig,
  pluginRegistry: PluginRegistry,
  shouldCancel?: () => boolean
): DependencyNode[] {
  const nodes: DependencyNode[] = [];
  const visitedDirectories = new Set<string>();
  const canonicalRoot = fs.realpathSync(projectRoot);
  let totalBytes = 0;
  const gitignorePatterns =
    config.respectGitignore !== false
      ? readIgnorePatterns(path.join(projectRoot, ".gitignore"))
      : [];
  const ignorePatterns = [...config.ignore, ...gitignorePatterns];

  function walk(currentDir: string) {
    if (shouldCancel?.()) throw new Error("Analysis cancelled");
    let realDirectory: string;
    try {
      realDirectory = fs.realpathSync(currentDir);
    } catch {
      return;
    }
    if (visitedDirectories.has(realDirectory)) return;
    if (!isInside(canonicalRoot, realDirectory))
      throw new Error(
        `SECURITY_PATH_ESCAPE: directory resolves outside project root: ${currentDir}`
      );
    visitedDirectories.add(realDirectory);

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      if (shouldCancel?.()) throw new Error("Analysis cancelled");
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = toPosixRelativePath(absolutePath, projectRoot);

      // Check ignore patterns
      if (isIgnored(relativePath, entry.isDirectory(), ignorePatterns)) {
        continue;
      }

      if (entry.isSymbolicLink()) {
        if (config.symlinks !== "internal") continue;
        let target: string;
        try {
          target = fs.realpathSync(absolutePath);
        } catch {
          continue;
        }
        if (!isInside(canonicalRoot, target))
          throw new Error(
            `SECURITY_PATH_ESCAPE: symlink resolves outside project root: ${relativePath}`
          );
        if (safeIsDirectory(absolutePath)) walk(absolutePath);
        continue;
      }
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else {
        const plugin = pluginRegistry.findPluginForFile(absolutePath, relativePath);
        const ext = path.extname(relativePath).toLowerCase();
        const isAsset =
          config.includeNonCodeEdges !== false && config.assetExtensions?.includes(ext);

        if (plugin || config.extensions.includes(ext) || isAsset) {
          const isTest = plugin?.testFileDetector?.isTestFile(absolutePath, relativePath) ?? false;
          const isGen =
            plugin?.generatedFileDetector?.isGeneratedFile(absolutePath, relativePath) ?? false;
          const isConfig =
            plugin?.configFileDetector?.isConfigFile(absolutePath, relativePath) ?? false;

          const langName = plugin ? plugin.id.replace("cascade-language-", "") : "unknown";

          let byteSize = 0;
          try {
            const stat = fs.statSync(absolutePath);
            byteSize = stat.size;
            if (byteSize > (config.maxFileSizeBytes ?? Number.POSITIVE_INFINITY))
              throw new Error(
                `RESOURCE_LIMIT: '${relativePath}' is ${byteSize} bytes; maxFileSizeBytes is ${config.maxFileSizeBytes}.`
              );
            totalBytes += byteSize;
            if (totalBytes > (config.maxTotalBytes ?? Number.POSITIVE_INFINITY))
              throw new Error(
                `RESOURCE_LIMIT: repository source bytes exceed maxTotalBytes (${config.maxTotalBytes}).`
              );
          } catch (error) {
            if ((error as Error).message.startsWith("RESOURCE_LIMIT")) throw error;
            throw new Error(`SECURITY_FILE_READ: cannot safely inspect '${relativePath}'.`);
          }

          nodes.push({
            id: relativePath, // Stable relative ID
            absolutePath,
            relativePath,
            language: langName,
            fileCategory: isTest
              ? "test"
              : isGen
                ? "generated"
                : isConfig
                  ? "config"
                  : isAsset
                    ? "asset"
                    : "source",
            isEntryPoint: false,
            isTestFile: isTest,
            isGeneratedFile: isGen,
            parseStatus: "success",
            metrics: {
              lineCount: 0,
              byteSize,
              symbolCount: 0,
              dependencyCount: 0,
            },
            pluginProvenance: {
              pluginId: plugin ? plugin.id : "cascade-core",
              pluginVersion: plugin ? plugin.version : "3.3.1",
            },
            diagnostics: [],
          });
          if (nodes.length > (config.maxFiles ?? Number.POSITIVE_INFINITY))
            throw new Error(`RESOURCE_LIMIT: repository exceeds maxFiles (${config.maxFiles}).`);
        }
      }
    }
  }

  walk(projectRoot);
  return nodes;
}

function isInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
  );
}

function safeIsDirectory(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function readIgnorePatterns(filePath: string): string[] {
  try {
    return fs
      .readFileSync(filePath, "utf-8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#") && !line.startsWith("!"))
      .map((line) => line.replace(/^\//, ""))
      .flatMap((line) =>
        line.endsWith("/") ? [line + "**", `**/${line}**`] : [line, `**/${line}`]
      );
  } catch {
    return [];
  }
}

function isIgnored(relativePath: string, isDirectory: boolean, patterns: string[]): boolean {
  const candidate = isDirectory ? `${relativePath}/` : relativePath;
  return patterns.some(
    (pattern) =>
      minimatch(relativePath, pattern, { dot: true }) ||
      minimatch(candidate, pattern, { dot: true }) ||
      minimatch(relativePath, `${pattern}/**`, { dot: true })
  );
}
