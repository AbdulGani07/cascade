import { performance } from "node:perf_hooks";
import { extractGoDependencies } from "../dist/index.js";

for (const size of [100, 1_000, 5_000]) {
  const source = `package benchmark
import (
${Array.from({ length: size }, (_, index) => `alias${index} "example.com/pkg${index}"`).join("\n")}
)`;
  const started = performance.now();
  const result = extractGoDependencies("benchmark.go", source);
  const elapsed = performance.now() - started;
  console.log(
    JSON.stringify({
      language: "go",
      imports: size,
      extractedEdges: result.dependencies.length,
      milliseconds: Number(elapsed.toFixed(2)),
    })
  );
}
