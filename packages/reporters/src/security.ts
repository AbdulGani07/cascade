import type { AnalysisResult } from "@cascade/plugin-api";

export function safeReportResult(result: AnalysisResult): AnalysisResult {
  const serialized = JSON.stringify(result, (_key, value) =>
    typeof value === "string" ? redact(value) : value
  );
  const safe = JSON.parse(serialized) as AnalysisResult;
  safe.projectRoot = ".";
  safe.nodes = safe.nodes.map((node) => ({
    ...node,
    absolutePath: node.relativePath,
    id: safePath(node.id),
    relativePath: safePath(node.relativePath),
  }));
  return safe;
}

export function safePath(value: string): string {
  const normalized = redact(value)
    .replace(/\\/g, "/")
    .replace(/[\u0000-\u001f\u007f]/g, "");
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized))
    return "[absolute-path-redacted]";
  return normalized.replace(/^\.\//, "");
}

export function markdownCode(value: string): string {
  return safePath(value).replace(/`/g, "\u02cb").replace(/[<>]/g, "");
}

function redact(value: string): string {
  return value
    .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g, "[REDACTED]")
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, "[REDACTED]")
    .replace(
      /((?:api[_-]?key|token|secret|password|authorization)\s*[:=]\s*["']?)[^\s"',;]+/gi,
      "$1[REDACTED]"
    );
}
