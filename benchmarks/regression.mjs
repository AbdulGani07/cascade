import { performance } from "node:perf_hooks";
import { detectCycles } from "../packages/core/dist/index.js";

const nodes = new Map();
const outgoing = new Map();
const incoming = new Map();
const count = 20_000;
const fanout = 8;
for (let index = 0; index < count; index++) {
  const id = `n-${index}`;
  nodes.set(id, { id });
  outgoing.set(id, []);
  incoming.set(id, []);
}
for (let index = 0; index < count; index++) {
  const from = `n-${index}`;
  for (let offset = 1; offset <= fanout; offset++) {
    const to = `n-${(index + offset) % count}`;
    outgoing.get(from).push(to);
    incoming.get(to).push(from);
  }
}
const graph = {
  nodes,
  edges: [],
  neighborsOf: (id) => outgoing.get(id) ?? [],
  incomingTo: (id) => incoming.get(id) ?? [],
};
const started = performance.now();
const cycles = detectCycles(graph);
const elapsedMs = performance.now() - started;
const thresholdMs = Number(process.env.CASCADE_CYCLE_THRESHOLD_MS ?? 2_500);
console.log(JSON.stringify({ count, fanout, cycles: cycles.length, elapsedMs, thresholdMs }));
if (cycles.length !== 1 || elapsedMs > thresholdMs) process.exitCode = 1;
