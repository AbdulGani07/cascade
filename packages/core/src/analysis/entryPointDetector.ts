import fs from "node:fs";
import path from "node:path";
import { DependencyNode, EntryPointEvidence } from "@cascade-code/plugin-api";
import { CascadeConfig } from "@cascade-code/config";
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
  return detectEntryPointEvidence(projectRoot, nodes, config, pluginRegistry).map(
    (item) => item.file
  );
}

export function detectEntryPointEvidence(
  projectRoot: string,
  nodes: DependencyNode[],
  config: CascadeConfig,
  pluginRegistry?: PluginRegistry
): EntryPointEvidence[] {
  const relativeToNodeIdMap = new Map<string, string>();
  nodes.forEach((n) => {
    relativeToNodeIdMap.set(n.id, n.id);
    relativeToNodeIdMap.set(n.relativePath, n.id);
    if (n.absolutePath) {
      relativeToNodeIdMap.set(n.absolutePath, n.id);
    }
  });

  const evidence = new Map<string, EntryPointEvidence>();
  const add = (
    candidate: string,
    reason: string,
    confidence: number,
    kind: EntryPointEvidence["kind"],
    project?: string
  ) => {
    const normalized = candidate.replace(/\\/g, "/").replace(/^\.\//, "");
    const id =
      relativeToNodeIdMap.get(normalized) ??
      relativeToNodeIdMap.get(toPosixRelativePath(candidate, projectRoot)) ??
      relativeToNodeIdMap.get(candidate);
    if (!id) return;
    const previous = evidence.get(id);
    if (!previous || confidence > previous.confidence) {
      evidence.set(id, { file: id, reason, confidence, kind, project });
    }
  };

  for (const configured of config.entryPoints) {
    add(configured, "Configured entry point", 1, "configured");
  }

  // Package roots support npm/pnpm/Yarn workspaces and generic monorepos.
  const packageManifests = nodes
    .filter((node) => path.posix.basename(node.relativePath) === "package.json")
    .map((node) => node.absolutePath);
  const rootManifest = path.join(projectRoot, "package.json");
  if (fs.existsSync(rootManifest) && !packageManifests.includes(rootManifest)) {
    packageManifests.push(rootManifest);
  }
  for (const pkgPath of packageManifests) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const packageRoot = path.dirname(pkgPath);
      const packageRelative = toPosixRelativePath(packageRoot, projectRoot);
      const fromPackage = (target: string) =>
        add(
          path.posix.join(packageRelative === "." ? "" : packageRelative, target),
          `package.json entry field in ${packageRelative || "."}`,
          1,
          "package",
          pkg.name
        );
      for (const field of ["main", "module", "browser", "types", "typings"]) {
        if (typeof pkg[field] === "string") fromPackage(pkg[field]);
      }
      if (pkg.bin) {
        if (typeof pkg.bin === "string") fromPackage(pkg.bin);
        else Object.values(pkg.bin).forEach((v) => typeof v === "string" && fromPackage(v));
      }
      collectExportTargets(pkg.exports).forEach(fromPackage);
    } catch {
      // Malformed manifests are reported by resolution when referenced.
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
            hints.forEach((h) => add(h.relativePath, h.reason, h.confidence, "convention"));
          }
        } catch {
          /* Ignore plugin hint errors */
        }
      }
    }
  }

  for (const node of nodes) {
    const rel = node.relativePath;
    if (
      /(^|\/)(pages|app)\/.+\.(tsx?|jsx?)$/.test(rel) &&
      !/\/(_components|components|lib)\//.test(rel)
    ) {
      add(rel, "Next.js route module", 0.95, "framework");
    } else if (/(^|\/)src\/(server|main|app)\.(tsx?|jsx?|mjs|cjs|mts|cts)$/.test(rel)) {
      add(rel, "Application bootstrap convention", 0.85, "convention");
    }
    if (node.isTestFile) {
      add(rel, "Test root", 0.8, "test");
    }
  }
  return [...evidence.values()];
}

function collectExportTargets(value: unknown): string[] {
  const result: string[] = [];
  const visit = (current: unknown): void => {
    if (typeof current === "string") result.push(current);
    else if (Array.isArray(current)) current.forEach(visit);
    else if (current && typeof current === "object") Object.values(current).forEach(visit);
  };
  visit(value);
  return [...new Set(result)];
}
