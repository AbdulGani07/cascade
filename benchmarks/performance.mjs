import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { analyze, toJson } from "../packages/core/dist/index.js";

const include50k = process.env.CASCADE_BENCH_50K === "1";
const maxFiles = Number(process.env.CASCADE_BENCH_MAX_FILES ?? 10_000);
const scaleOnly = process.env.CASCADE_BENCH_SCALE_ONLY === "1";
const timeoutMs = Number(process.env.CASCADE_BENCH_TIMEOUT_MS ?? 300_000);
const sizes = [100, 1_000, 10_000, ...(include50k ? [50_000] : [])].filter(
  (count) => count <= maxFiles
);
const results = [];

function writeFixture(root, count, shape) {
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.writeFileSync(path.join(root, "package.json"), '{"name":"cascade-perf-fixture"}');
  for (let index = 0; index < count; index++) {
    let targets = [];
    if (shape === "chain" && index + 1 < count) targets = [index + 1];
    if (shape === "cycle") targets = [(index + 1) % count];
    if (shape === "dense") {
      targets = Array.from({ length: Math.min(16, count - 1) }, (_, offset) =>
        (index + offset + 1) % count
      );
    }
    if (shape === "unresolved") targets = Array.from({ length: 8 }, (_, offset) => count + index * 8 + offset);
    const imports = targets.map((target) => `import "./m-${target}.js";`).join("\n");
    fs.writeFileSync(path.join(root, "src", `m-${index}.js`), `${imports}\nexport const v=${index};\n`);
  }
}

function peakSampler() {
  let peak = process.memoryUsage().rss;
  const timer = setInterval(() => {
    peak = Math.max(peak, process.memoryUsage().rss);
  }, 5);
  timer.unref();
  return () => {
    clearInterval(timer);
    return peak;
  };
}

function runFixture(name, count, shape) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `cascade-perf-${name}-`));
  try {
    writeFixture(root, count, shape);
    global.gc?.();
    const rssBefore = process.memoryUsage().rss;
    const stopPeak = peakSampler();
    const phases = {};
    const started = performance.now();
    const materializeImpact = shape === "chain" && count <= 1_000;
    const result = analyze(root, {
      impact: materializeImpact ? "full" : "none",
      timeoutMs,
      onPhase: (phase, elapsedMs) => {
        phases[phase] = (phases[phase] ?? 0) + elapsedMs;
      },
    });
    const analysisMs = performance.now() - started;
    const serializationStarted = performance.now();
    const json = toJson(result);
    const serializationMs = performance.now() - serializationStarted;
    const dashboardStarted = performance.now();
    const parsed = JSON.parse(json);
    const degree = new Map();
    for (const edge of parsed.edges) {
      degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
      degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
    }
    parsed.nodes
      .map((node) => node.id)
      .sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || a.localeCompare(b))
      .slice(0, 400);
    const dashboardLoadMs = performance.now() - dashboardStarted;
    const sampledPeak = stopPeak();
    const peakRssMiB =
      (Math.max(sampledPeak, process.memoryUsage().rss) - rssBefore) / 1024 / 1024;
    let warmAnalysisMs;
    let incrementalUpdateMs;
    if (count <= 1_000 && shape === "chain") {
      const warmStarted = performance.now();
      analyze(root, { impact: "none", timeoutMs });
      warmAnalysisMs = performance.now() - warmStarted;
      fs.appendFileSync(path.join(root, "src", "m-0.js"), "// deterministic edit\n");
      const incrementalStarted = performance.now();
      analyze(root, { impact: "none", timeoutMs });
      incrementalUpdateMs = performance.now() - incrementalStarted;
    }
    results.push({
      name,
      shape,
      files: result.nodes.length,
      edges: result.edges.length,
      phases,
      analysisMs,
      serializationMs,
      dashboardLoadMs,
      peakRssMiB: Math.max(0, peakRssMiB),
      warmAnalysisMs,
      incrementalUpdateMs,
      cacheSpeedup: warmAnalysisMs ? analysisMs / warmAnalysisMs : undefined,
      jsonMiB: Buffer.byteLength(json) / 1024 / 1024,
      impactMode: materializeImpact ? "full" : "none",
    });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

for (const count of sizes) runFixture(`chain-${count}`, count, "chain");
if (!scaleOnly) {
  runFixture("dense-250", 250, "dense");
  runFixture("cycle-1000", 1_000, "cycle");
  runFixture("unresolved-250", 250, "unresolved");
}

console.log(JSON.stringify({
  schemaVersion: 1,
  runtime: { node: process.version, platform: process.platform, arch: process.arch },
  fixturePolicy: { deterministic: true, include50k, maxFiles, scaleOnly, timeoutMs },
  results,
}, null, 2));
