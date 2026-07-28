import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { analyze } from "../packages/core/dist/index.js";
import { createJavaPlugin } from "../packages/language-java/dist/index.js";
import { createKotlinPlugin } from "../packages/language-kotlin/dist/index.js";
import { createCSharpPlugin } from "../packages/language-csharp/dist/index.js";
import { createGoPlugin } from "../packages/language-go/dist/index.js";
import { createRustPlugin } from "../packages/language-rust/dist/index.js";
import { createCPlugin } from "../packages/language-c/dist/index.js";
import { createCppPlugin } from "../packages/language-cpp/dist/index.js";
import {
  createDartPlugin,
  createGraphqlPlugin,
  createLuaPlugin,
  createPhpPlugin,
  createPowerShellPlugin,
  createRPlugin,
  createRubyPlugin,
  createShellPlugin,
  createStylesPlugin,
  createSveltePlugin,
  createSwiftPlugin,
  createVuePlugin,
} from "../packages/language-expanded/dist/index.js";

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
  ["Rust", createRustPlugin(), (index) => `use benchmark::Type${index};\n`, "fn main() {}"],
  ["C", createCPlugin(), (index) => `#include "type${index}.h"\n`, "int main(void) { return 0; }"],
  ["C++", createCppPlugin(), (index) => `#include "type${index}.hpp"\n`, "int main() { return 0; }"],
  ["PHP", createPhpPlugin(), (index) => `require "./type${index}.php";\n`, "<?php\n"],
  ["Ruby", createRubyPlugin(), (index) => `require_relative "./type${index}"\n`, ""],
  ["Swift", createSwiftPlugin(), (index) => `import Type${index}\n`, ""],
  ["Dart", createDartPlugin(), (index) => `import "./type${index}.dart";\n`, ""],
  ["Shell", createShellPlugin(), (index) => `source "./type${index}.sh"\n`, ""],
  ["PowerShell", createPowerShellPlugin(), (index) => `Import-Module "./Type${index}.psm1"\n`, ""],
  ["Lua", createLuaPlugin(), (index) => `require("./type${index}")\n`, ""],
  ["R", createRPlugin(), (index) => `source("./type${index}.R")\n`, ""],
  ["Vue", createVuePlugin(), (index) => `import Type${index} from "./Type${index}.vue"\n`, "<script>\n", "</script>"],
  ["Svelte", createSveltePlugin(), (index) => `import "./type${index}.js"\n`, "<script>\n", "</script>"],
  ["Styles", createStylesPlugin(), (index) => `@import "./type${index}.css";\n`, ""],
  ["GraphQL", createGraphqlPlugin(), (index) => `#import "./type${index}.graphql"\n`, ""],
];
for (const [language, plugin, importLine, prefixOrSuffix, optionalSuffix] of languageCases) {
  const importCount = 1_000;
  const imports = Array.from({ length: importCount }, (_, index) => importLine(index)).join("");
  const content = optionalSuffix ? `${prefixOrSuffix}${imports}${optionalSuffix}` : `${imports}${prefixOrSuffix}`;
  const extension =
    {
      "C#": "cs",
      "C++": "cpp",
      Rust: "rs",
      Shell: "sh",
      PowerShell: "ps1",
      Styles: "css",
      GraphQL: "graphql",
    }[language] ?? language.toLowerCase();
  const context = { filePath: `benchmark.${extension}`, relativePath: `benchmark.${extension}`, content };
  const started = performance.now();
  const parsed = plugin.parser.parse(context);
  plugin.dependencyExtractor.extractDependencies({ ...context, ast: parsed.ast });
  console.log(`| ${language} | ${importCount} | ${(performance.now() - started).toFixed(1)} |`);
}
