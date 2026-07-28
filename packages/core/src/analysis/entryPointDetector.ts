import fs from "node:fs";
import path from "node:path";
import { DependencyNode } from "@cascade/plugin-api";
import { CascadeConfig } from "@cascade/config";
import { PluginRegistry } from "../plugins/pluginRegistry.js";
import { toPosixRelativePath } from "../utils/pathUtils.js";

/**
 * Detects entry points based on config, package.json, and registered language plugin hints.
 */
export function detectEntryPoints(
  projectRoot: string,
  nodes: DependencyNode[],
  config: CascadeConfig,
  pluginRegistry?: PluginRegistry
): string[] {
  const relativeToNodeIdMap = new Map<string, string>();
  nodes.forEach((n) => {
    relativeToNodeIdMap.set(n.id, n.id);
    relativeToNodeIdMap.set(n.relativePath, n.id);
    if (n.absolutePath) {
      relativeToNodeIdMap.set(n.absolutePath, n.id);
    }
  });

  const candidates = new Set<string>(config.entryPoints);

  // 1. Check package.json main, bin, exports
  const pkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.main) candidates.add(pkg.main);
      if (pkg.bin) {
        if (typeof pkg.bin === "string") candidates.add(pkg.bin);
        else Object.values(pkg.bin).forEach((v) => candidates.add(v as string));
      }
    } catch {
      /* Ignore parse errors */
    }
  }

  // 2. Collect plugin entry point hints
  if (pluginRegistry) {
    const allRelFiles = nodes.map((n) => n.relativePath);
    for (const plugin of pluginRegistry.getRegisteredPlugins()) {
      if (plugin.entryPointHints) {
        try {
          const hints = plugin.entryPointHints.detectEntryPoints(projectRoot, allRelFiles);
          if (Array.isArray(hints)) {
            hints.forEach((h) => candidates.add(h.relativePath));
          }
        } catch {
          /* Ignore plugin hint errors */
        }
      }
    }
  }

  const results = new Set<string>();
  for (const candidate of candidates) {
    const posixRel = toPosixRelativePath(candidate, projectRoot);
    if (relativeToNodeIdMap.has(posixRel)) {
      results.add(relativeToNodeIdMap.get(posixRel)!);
    } else if (relativeToNodeIdMap.has(candidate)) {
      results.add(relativeToNodeIdMap.get(candidate)!);
    }
  }

  return Array.from(results);
}
