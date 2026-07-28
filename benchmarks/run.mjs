import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { analyze } from "../packages/core/dist/index.js";
import { createJavaPlugin } from "../packages/language-java/dist/index.js";
import { createKotlinPlugin } from "../packages/language-kotlin/dist/index.js";
import { createCSharpPlugin } from "../packages/language-csharp/dist/index.js";
import { createGoPlugin } from "../packages/language-go/dist/index.js";

const sizes = [
  ["small", 100],
  ["medium", 1_000],
  ["large", 5_000],
];

console.log("| Fixture | Files | Edges | Time (ms) | Heap delta (MB) |");
console.log("| --- | ---: | ---: | ---: | ---: |");

for (const [name, count] of sizes) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `cascade-benchmark-${name}-`));
  const source = path.join(root, "src");
  fs.mkdirSync(source, { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: `benchmark-${name}`, main: "src/index.ts" })
  );
  for (let index = 0; index < count; index++) {
    const next = index + 1 < count ? `import "./module-${index + 1}";\n` : "";
    fs.writeFileSync(path.join(source, index === 0 ? "index.ts" : `module-${index}.ts`), `${next}export const value${index} = ${index};\n`);
  }

  const heapBefore = process.memoryUsage().heapUsed;
  const started = performance.now();
  const result = analyze(root);
  const elapsed = performance.now() - started;
  const heapDelta = (process.memoryUsage().heapUsed - heapBefore) / 1024 / 1024;
  console.log(`| ${name} | ${result.nodes.length} | ${result.edges.length} | ${elapsed.toFixed(1)} | ${heapDelta.toFixed(1)} |`);
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("\n| Language | Imports | Parse + extract (ms) |");
console.log("| --- | ---: | ---: |");
const languageCases = [
  ["Java", createJavaPlugin(), (index) => `import benchmark.Type${index};\n`, "class Main {}"],
  ["Kotlin", createKotlinPlugin(), (index) => `import benchmark.Type${index}\n`, "fun main() {}"],
  ["C#", createCSharpPlugin(), (index) => `using Benchmark.Type${index};\n`, "class Program {}"],
  ["Go", createGoPlugin(), (index) => `\"example.com/benchmark/type${index}\"\n`, "package main\nimport (\n", ")\nfunc main() {}"],
];
for (const [language, plugin, importLine, prefixOrSuffix, optionalSuffix] of languageCases) {
  const importCount = 1_000;
  const imports = Array.from({ length: importCount }, (_, index) => importLine(index)).join("");
  const content = optionalSuffix ? `${prefixOrSuffix}${imports}${optionalSuffix}` : `${imports}${prefixOrSuffix}`;
  const context = { filePath: `benchmark.${language === "C#" ? "cs" : language.toLowerCase()}`, relativePath: "benchmark", content };
  const started = performance.now();
  const parsed = plugin.parser.parse(context);
  plugin.dependencyExtractor.extractDependencies({ ...context, ast: parsed.ast });
  console.log(`| ${language} | ${importCount} | ${(performance.now() - started).toFixed(1)} |`);
}
