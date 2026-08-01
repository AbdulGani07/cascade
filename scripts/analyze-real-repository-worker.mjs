import fs from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { analyze } from "../packages/core/dist/index.js";

const root = path.resolve(process.argv[2]);
const started = performance.now();
const phases = [];
let fileCount = 0;
const visit = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const candidate = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(candidate);
    else if (entry.isFile()) fileCount++;
  }
};
visit(root);
try {
  const result = analyze(root, {
    impact: "none",
    timeoutMs: Number(process.env.CASCADE_REAL_REPOSITORY_TIMEOUT_MS ?? 180_000),
    onPhase: (phase, durationMs) => phases.push({ phase, durationMs: Math.round(durationMs) }),
  });
  const statuses = { resolved: 0, unresolved: 0, external: 0, ambiguous: 0 };
  for (const edge of result.edges) statuses[edge.resolutionStatus]++;
  const warningMessages = [
    ...result.warnings.map((warning) => warning.message),
    ...(result.diagnostics ?? []).map((diagnostic) => diagnostic.message),
  ];
  const warningKinds = Object.entries(
    warningMessages.reduce((counts, message) => {
      const normalized = message.replace(/\d+/g, "#").slice(0, 160);
      counts[normalized] = (counts[normalized] ?? 0) + 1;
      return counts;
    }, {})
  )
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([message, count]) => ({ message, count }));
  console.log(
    JSON.stringify({
      fileCount,
      nodeCount: result.nodes.length,
      edgeCount: result.edges.length,
      dependencies: statuses,
      durationMs: Math.round(performance.now() - started),
      peakMemoryMiB: Math.round((process.resourceUsage().maxRSS / 1024) * 10) / 10,
      cycleCount: result.cycles.length,
      warningCount: result.warnings.length + (result.diagnostics?.length ?? 0),
      warningKinds,
      crashed: false,
      phases,
    })
  );
} catch (error) {
  console.log(
    JSON.stringify({
      fileCount,
      durationMs: Math.round(performance.now() - started),
      peakMemoryMiB: Math.round((process.resourceUsage().maxRSS / 1024) * 10) / 10,
      crashed: true,
      error: String(error.message),
      phases,
    })
  );
}
