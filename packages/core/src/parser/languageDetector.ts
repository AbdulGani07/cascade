import path from "node:path";
import { PluginRegistry } from "../plugins/pluginRegistry.js";

/**
 * Determines language using the PluginRegistry.
 */
export function detectLanguageWithRegistry(
  filePath: string,
  pluginRegistry: PluginRegistry
): string {
  const plugin = pluginRegistry.findPluginForFile(filePath, filePath);
  if (plugin) {
    return plugin.id.replace("cascade-language-", "");
  }

  const ext = path.extname(filePath).toLowerCase();
  if ([".ts", ".tsx", ".mts", ".cts"].includes(ext)) return "typescript";
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "javascript";
  return "unknown";
}

/** Legacy helper for backward compatibility */
export function detectLanguage(filePath: string): "typescript" | "javascript" | null {
  const ext = path.extname(filePath).toLowerCase();
  if ([".ts", ".tsx", ".mts", ".cts"].includes(ext)) return "typescript";
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "javascript";
  return null;
}
