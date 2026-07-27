import path from "node:path";

/**
 * Determines the language of a file based on its extension.
 * Returns null if the file is not a supported source file.
 */
export function detectLanguage(filePath: string): "typescript" | "javascript" | null {
  const ext = path.extname(filePath).toLowerCase();
  if ([".ts", ".tsx"].includes(ext)) return "typescript";
  if ([".js", ".jsx", ".mjs", ".cjs"].includes(ext)) return "javascript";
  return null;
}