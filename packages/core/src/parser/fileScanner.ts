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

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = toPosixRelativePath(absolutePath, projectRoot);

      // Check ignore patterns
      if (config.ignore.some((pattern: string) => minimatch(relativePath, pattern))) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(absolutePath);
      } else {
        const plugin = pluginRegistry.findPluginForFile(absolutePath, relativePath);
        const ext = path.extname(relativePath).toLowerCase();

        if (plugin || config.extensions.includes(ext)) {
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
            fileCategory: isTest ? "test" : isGen ? "generated" : isConfig ? "config" : "source",
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
              pluginVersion: plugin ? plugin.version : "1.0.0",
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
