import fs from "node:fs";
import path from "node:path";
import { minimatch } from "minimatch";
import { DependencyNode } from "@cascade/plugin-api";
import { CascadeConfig } from "@cascade/config";
import { PluginRegistry } from "../plugins/pluginRegistry.js";
import { toPosixRelativePath } from "../utils/pathUtils.js";

/**
 * Recursively scans project directory for files using PluginRegistry to match language plugins.
 */
export function scanFiles(
  projectRoot: string,
  config: CascadeConfig,
  pluginRegistry: PluginRegistry
): DependencyNode[] {
  const nodes: DependencyNode[] = [];
  const visitedDirectories = new Set<string>();
  const gitignorePatterns =
    config.respectGitignore !== false
      ? readIgnorePatterns(path.join(projectRoot, ".gitignore"))
      : [];
  const ignorePatterns = [...config.ignore, ...gitignorePatterns];

  function walk(currentDir: string) {
    let realDirectory: string;
    try {
      realDirectory = fs.realpathSync(currentDir);
    } catch {
      return;
    }
    if (visitedDirectories.has(realDirectory)) return;
    visitedDirectories.add(realDirectory);

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = toPosixRelativePath(absolutePath, projectRoot);

      // Check ignore patterns
      if (isIgnored(relativePath, entry.isDirectory(), ignorePatterns)) {
        continue;
      }

      if (entry.isDirectory() || (entry.isSymbolicLink() && safeIsDirectory(absolutePath))) {
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

          let lineCount = 0;
          let byteSize = 0;
          try {
            const stat = fs.statSync(absolutePath);
            byteSize = stat.size;
            const content = fs.readFileSync(absolutePath, "utf-8");
            lineCount = content.split("\n").length;
          } catch {
            // Ignore stat read failure
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
              lineCount,
              byteSize,
              symbolCount: 0,
              dependencyCount: 0,
            },
            pluginProvenance: {
              pluginId: plugin ? plugin.id : "cascade-core",
              pluginVersion: plugin ? plugin.version : "2.3.0",
            },
            diagnostics: [],
          });
        }
      }
    }
  }

  walk(projectRoot);
  return nodes;
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
