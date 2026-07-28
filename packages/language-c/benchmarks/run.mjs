import { performance } from "node:perf_hooks";
import { extractCDependencies } from "../dist/index.js";

for (const count of [100, 1000, 5000]) {
  const source = Array.from({ length: count }, (_, index) => `#include "lib/header_${index}.h"`).join("\n");
  const start = performance.now();
  const result = extractCDependencies("src/main.c", source);
  console.log(JSON.stringify({ language: "C", includes: count, edges: result.dependencies.length, milliseconds: +(performance.now() - start).toFixed(2) }));
}
