import { performance } from "node:perf_hooks";
import { extractCSharpDependencies } from "../dist/index.js";

for (const size of [100, 1_000, 5_000]) {
  const source = Array.from({ length: size }, (_, index) => `using Cascade.Feature${index};`).join(
    "\n"
  );
  const started = performance.now();
  const result = extractCSharpDependencies("Benchmark.cs", source);
  const elapsed = performance.now() - started;
  console.log(
    JSON.stringify({
      language: "csharp",
      usingDirectives: size,
      extractedEdges: result.dependencies.length,
      milliseconds: Number(elapsed.toFixed(2)),
    })
  );
}
