import fs from "node:fs";
import path from "node:path";
import { AnalysisResult } from "../types/index.js";

/**
 * Serializes AnalysisResult to JSON, converting all internal absolute paths 
 * to project-relative paths for schema consistency.
 */
export function toJson(result: AnalysisResult): string {
  const root = result.projectRoot;

  const toRelative = (absPath: string) => path.relative(root, absPath).replace(/\\/g, "/");

  // Create a deep copy with relative paths to avoid mutating the original
  const relativeResult = {
    ...result,
    nodes: result.nodes.map((n: AnalysisResult["nodes"][number]) => ({ ...n, id: toRelative(n.id) })),
    edges: result.edges.map((e: AnalysisResult["edges"][number]) => ({ ...e, from: toRelative(e.from), to: toRelative(e.to) })),
    cycles: result.cycles.map((c: string[]) => c.map(toRelative)),
    deadFiles: result.deadFiles.map(toRelative),
    entryPoints: result.entryPoints.map(toRelative),
    impact: Object.fromEntries(
      Object.entries(result.impact).map(([key, val]) => [
        toRelative(key),
        {
          ...val,
          target: toRelative(val.target),
          directlyAffected: val.directlyAffected.map(toRelative),
          allAffected: val.allAffected.map(toRelative),
        }
      ])
    )
  };

  return JSON.stringify(relativeResult, null, 2);
}

/**
 * Writes the AnalysisResult to a file on disk as a JSON string.
 */
export function writeJsonFile(result: AnalysisResult, outputPath: string): void {
  fs.writeFileSync(outputPath, toJson(result), "utf-8");
}