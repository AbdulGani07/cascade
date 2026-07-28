import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "@cascade/core";

describe("native-language analysis", () => {
  it("analyzes a CMake C project without inventing system-header targets", () => {
    const result = analyze(path.resolve("tests/fixtures/native/cmake-c"));
    expect(result.nodes.find((node) => node.relativePath === "src/main.c")).toMatchObject({
      language: "c",
      isEntryPoint: true,
      parseStatus: "success",
    });
    expect(result.edges.find((edge) => edge.extractedText === "greeting.h")).toMatchObject({
      resolutionStatus: "resolved",
      dependencyCategory: "internal",
      confidence: 0.86,
    });
    expect(result.edges.find((edge) => edge.extractedText === "stdio.h")).toMatchObject({
      resolutionStatus: "external",
      dependencyCategory: "standard-library",
    });
    expect(result.nodes.some((node) => node.relativePath === "generated/client.c")).toBe(false);
    expect(result.diagnostics.some((diagnostic) => diagnostic.code === "C_PARSE_ERROR")).toBe(true);
    expect(
      result.diagnostics.some((diagnostic) => diagnostic.code === "C_INCLUDE_UNRESOLVED")
    ).toBe(true);
  });

  it("resolves an explicit C++ include across CMake subprojects", () => {
    const result = analyze(path.resolve("tests/fixtures/native/cpp-multi"));
    expect(result.nodes.find((node) => node.relativePath === "app/main.cpp")).toMatchObject({
      language: "cpp",
      isEntryPoint: true,
    });
    expect(
      result.nodes.find((node) => node.relativePath === "tests/greeter_test.cpp")?.isTestFile
    ).toBe(true);
    expect(result.edges.find((edge) => edge.extractedText === "greeter.hpp")).toMatchObject({
      resolutionStatus: "resolved",
      dependencyCategory: "internal",
    });
  });
});
