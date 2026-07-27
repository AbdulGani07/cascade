import fs from "node:fs";
import path from "node:path";
import { DependencyNode, ResolvedConfig } from "../types/index.js";

/**
 * Detects entry points based on config and common conventions (package.json).
 */
export function detectEntryPoints(projectRoot: string, nodes: DependencyNode[], config: ResolvedConfig): string[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const candidates = new Set<string>(config.entryPoints);

  // Check package.json for main/bin
  const pkgPath = path.join(projectRoot, "package.json");
  if (fs.existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      if (pkg.main) candidates.add(pkg.main);
      if (pkg.bin) {
        if (typeof pkg.bin === "string") candidates.add(pkg.bin);
        else Object.values(pkg.bin).forEach((v) => candidates.add(v as string));
      }
    } catch { /* Ignore package.json parse errors */ }
  }

  const results = new Set<string>();
  for (const rel of candidates) {
    const absolute = path.resolve(projectRoot, rel);
    if (nodeMap.has(absolute)) {
      results.add(absolute);
    }
  }

  return Array.from(results);
}