import { performance } from "node:perf_hooks";
import Parser from "tree-sitter";
import Cpp from "tree-sitter-cpp";
import { extractCDependencies } from "@cascade/language-c";

const parser = new Parser();
parser.setLanguage(Cpp);
for (const count of [100, 1000, 5000]) {
  const source = Array.from({ length: count }, (_, index) => `#include "lib/header_${index}.hpp"`).join("\n");
  const start = performance.now();
  const tree = parser.parse(source);
  const result = extractCDependencies("src/main.cpp", source, tree);
  console.log(JSON.stringify({ language: "C++", includes: count, edges: result.dependencies.length, milliseconds: +(performance.now() - start).toFixed(2) }));
}
