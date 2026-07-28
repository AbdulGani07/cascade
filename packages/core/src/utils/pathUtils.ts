import path from "node:path";

/**
 * Normalizes any absolute or relative path into a clean, POSIX-style relative path.
 * Converts Windows backslashes (\) to POSIX forward slashes (/).
 * Removes leading slashes and dot prefixes (e.g. "./src/app.ts" -> "src/app.ts").
 */
export function toPosixRelativePath(filePath: string, rootDir?: string): string {
  if (!filePath) return "";

  // Standardize backslashes to forward slashes first
  let normalized = filePath.replace(/\\/g, "/");

  if (rootDir) {
    const normalizedRoot = rootDir.replace(/\\/g, "/");
    if (path.isAbsolute(filePath) || normalized.startsWith(normalizedRoot)) {
      const rel = path.relative(normalizedRoot, normalized).replace(/\\/g, "/");
      normalized = rel;
    }
  }

  // Strip leading dot-slash or slash if present
  normalized = normalized.replace(/^\.\//, "").replace(/^\//, "");

  return normalized;
}
