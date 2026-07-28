import { performance } from "node:perf_hooks";
import { extractRustDependencies } from "../dist/index.js";

for (const size of [100, 1_000, 5_000]) {
  const source = Array.from(
    { length: size },
    (_, index) => `use crate::generated::module_${index}::Type${index};`
  ).join("\n");
  const started = performance.now();
  const result = extractRustDependencies("src/lib.rs", source);
  console.log(
    JSON.stringify({
      language: "rust",
      imports: size,
      extractedEdges: result.dependencies.length,
      milliseconds: Number((performance.now() - started).toFixed(2))
    })
  );
}
