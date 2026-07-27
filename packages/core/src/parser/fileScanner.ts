import fs from "node:fs";
import path from "node:path";
import { minimatch } from "minimatch";
import { ResolvedConfig, DependencyNode } from "../types/index.js";
import { detectLanguage } from "./languageDetector.js";

/**
 * Recursively scans the project directory for source files,
 * filtering out ignored paths and unsupported file types.
 */
export function scanFiles(projectRoot: string, config: ResolvedConfig): DependencyNode[] {
  const files: DependencyNode[] = [];

  function walk(currentDir: string) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const absolutePath = path.join(currentDir, entry.name);
      const relativePath = path.relative(projectRoot, absolutePath).replace(/\\/g, "/");

      // Check ignore patterns
      if (config.ignore.some((pattern: string) => minimatch(relativePath, pattern))) {
        continue;
      }

      if (entry.isDirectory()) {
        walk(absolutePath);
      } else {
        const language = detectLanguage(relativePath);
        if (language && config.extensions.includes(path.extname(relativePath))) {
          files.push({
            id: absolutePath,
            relativePath,
            isEntryPoint: false,
            language,
          });
        }
      }
    }
  }

  walk(projectRoot);
  return files;
}