import { performance } from "node:perf_hooks";

const nodeCount = Number(process.argv[2] ?? 50_000);
const edgeCount = nodeCount * 2;
const nodes = Array.from({ length: nodeCount }, (_, index) => `node-${index.toString().padStart(6, "0")}`);
const edges = Array.from({ length: edgeCount }, (_, index) => ({ from: nodes[index % nodeCount], to: nodes[(index * 17 + 1) % nodeCount] }));
const started = performance.now();
const degree = new Map();
for (const edge of edges) { degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1); degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1); }
const visible = [...nodes].sort((left, right) => (degree.get(right) ?? 0) - (degree.get(left) ?? 0) || left.localeCompare(right)).slice(0, 400);
const elapsed = performance.now() - started;
const memory = process.memoryUsage();
console.log(JSON.stringify({ nodes: nodeCount, edges: edgeCount, visibleNodes: visible.length, selectionMs: Number(elapsed.toFixed(2)), heapUsedMiB: Number((memory.heapUsed / 1024 / 1024).toFixed(2)) }, null, 2));
