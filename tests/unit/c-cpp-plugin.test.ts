import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CLanguagePlugin, extractCDependencies } from "../../packages/language-c/src/index.js";
import { CppLanguagePlugin } from "../../packages/language-cpp/src/index.js";

const root = path.resolve("tests/fixtures/native");

describe("C plugin", () => {
  const plugin = new CLanguagePlugin();

  it("extracts local and system includes from the syntax tree", () => {
    const content = '#include <stdio.h>\n#include "greeting.h"\n';
    const parsed = plugin.parser.parse({
      filePath: "main.c",
      relativePath: "main.c",
      content,
      options: {},
    });
    const result = extractCDependencies("main.c", content, parsed.ast);
    expect(result.dependencies.map((dependency) => dependency.specifier)).toEqual([
      "stdio.h",
      "greeting.h",
    ]);
  });

  it("resolves local headers and preserves unresolved diagnostics", () => {
    const files = ["cmake-c/src/main.c", "cmake-c/include/greeting.h", "cmake-c/src/greeting.c"];
    const base = {
      importerFilePath: path.join(root, "cmake-c/src/main.c"),
      importerRelativePath: "cmake-c/src/main.c",
      projectRoot: root,
      allKnownFiles: files,
    };
    const resolved = plugin.moduleResolver.resolveModule({
      ...base,
      specifier: "greeting.h",
      extractedDependency: {
        specifier: "greeting.h",
        importKind: "reference",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
        rawText: '#include "greeting.h"',
      },
    });
    expect(resolved.resolutionStatus).toBe("resolved");
    expect(resolved.resolvedRelativePath).toBe("cmake-c/include/greeting.h");

    const unresolved = plugin.moduleResolver.resolveModule({
      ...base,
      specifier: "absent.h",
      extractedDependency: {
        specifier: "absent.h",
        importKind: "reference",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
        rawText: '#include "absent.h"',
      },
    });
    expect(unresolved.resolutionStatus).toBe("unresolved");
    expect(unresolved.diagnostics?.[0]?.code).toBe("C_INCLUDE_UNRESOLVED");
  });

  it("handles malformed source and detects entry, test, and generated files", () => {
    const file = path.join(root, "cmake-c/src/broken.c");
    const content = fs.readFileSync(file, "utf8");
    const parsed = plugin.parser.parse({
      filePath: file,
      relativePath: "src/broken.c",
      content,
      options: {},
    });
    expect(parsed.status).toBe("partial");
    expect(plugin.testFileDetector?.isTestFile("", "tests/greeting_test.c")).toBe(true);
    expect(
      plugin.generatedFileDetector?.isGeneratedFile(
        "",
        "generated/client.c",
        "Generated code. DO NOT EDIT."
      )
    ).toBe(true);
    const entries = plugin.entryPointHints?.detectEntryPoints(path.join(root, "cmake-c"), [
      "src/main.c",
    ]);
    expect(entries?.[0]?.confidence).toBe(1);
  });

  it("bounds diagnostics for C++-like headers classified as C", () => {
    const content = Array.from(
      { length: 200 },
      (_, index) => `namespace n${index} { class C${index} { public: std::string value; }; }`
    ).join("\n");
    const parsed = plugin.parser.parse({
      filePath: "ambiguous.h",
      relativePath: "ambiguous.h",
      content,
      options: {},
    });
    expect(parsed.diagnostics.length).toBeLessThanOrEqual(51);
    expect(parsed.diagnostics.at(-1)?.code).toBe("C_PARSE_DIAGNOSTICS_TRUNCATED");
  });
});

describe("C++ plugin", () => {
  const plugin = new CppLanguagePlugin();

  it("uses the C++ grammar for includes, declarations, and main", () => {
    const relativePath = "cpp-multi/app/main.cpp";
    const file = path.join(root, relativePath);
    const content = fs.readFileSync(file, "utf8");
    const parsed = plugin.parser.parse({ filePath: file, relativePath, content, options: {} });
    expect(parsed.status).toBe("success");
    const extracted = plugin.dependencyExtractor.extractDependencies({
      filePath: file,
      relativePath,
      content,
      ast: parsed.ast,
      options: {},
    });
    expect(extracted.dependencies[0]?.specifier).toBe("greeter.hpp");
    const entries = plugin.entryPointHints?.detectEntryPoints(path.join(root, "cpp-multi"), [
      "app/main.cpp",
    ]);
    expect(entries?.[0]?.reason).toBe("C++ main function");
  });

  it("resolves a header across a CMake project with explicit evidence", () => {
    const result = plugin.moduleResolver.resolveModule({
      specifier: "greeter.hpp",
      importerFilePath: path.join(root, "cpp-multi/app/main.cpp"),
      importerRelativePath: "cpp-multi/app/main.cpp",
      projectRoot: root,
      allKnownFiles: ["cpp-multi/app/main.cpp", "cpp-multi/lib/include/greeter.hpp"],
      extractedDependency: {
        specifier: "greeter.hpp",
        importKind: "reference",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
        rawText: '#include "greeter.hpp"',
      },
    });
    expect(result).toMatchObject({
      resolutionStatus: "resolved",
      dependencyCategory: "internal",
      confidence: 0.86,
    });
    expect(result.evidence).toContain("unique repository include-suffix match");
  });

  it("bounds malformed C++ diagnostics", () => {
    const content = Array.from({ length: 200 }, () => "class { public: void ???(;").join("\n");
    const parsed = plugin.parser.parse({
      filePath: "broken.cpp",
      relativePath: "broken.cpp",
      content,
      options: {},
    });
    expect(parsed.diagnostics.length).toBeLessThanOrEqual(51);
    expect(parsed.diagnostics.at(-1)?.code).toBe("CPP_PARSE_DIAGNOSTICS_TRUNCATED");
  });
});
