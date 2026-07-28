import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "@cascade/core";

describe("C# solution analysis", () => {
  it("analyzes an SDK solution with project, framework, package, and unresolved edges", () => {
    const root = path.resolve("tests/fixtures/csharp/dotnet-solution");
    const result = analyze(root);
    const program = result.nodes.find((node) => node.relativePath.endsWith("App/Program.cs"));

    expect(program).toMatchObject({
      language: "csharp",
      isEntryPoint: true,
      parseStatus: "success",
    });
    expect(result.edges.find((edge) => edge.extractedText === "Cascade.Core")).toMatchObject({
      resolutionStatus: "resolved",
      dependencyCategory: "internal",
    });
    expect(result.edges.find((edge) => edge.extractedText === "System")).toMatchObject({
      resolutionStatus: "external",
      dependencyCategory: "standard-library",
    });
    expect(result.edges.find((edge) => edge.extractedText === "Serilog")).toMatchObject({
      resolutionStatus: "external",
      dependencyCategory: "external",
    });
    expect(result.edges.find((edge) => edge.extractedText === "Missing.Dependency")).toMatchObject({
      resolutionStatus: "unresolved",
      dependencyCategory: "unresolved",
    });
  });

  it("recognizes ASP.NET top-level entry points and excludes generated output", () => {
    const root = path.resolve("tests/fixtures/csharp/aspnet");
    const result = analyze(root);
    expect(result.entryPoints).toContain("Program.cs");
    expect(result.nodes.find((node) => node.relativePath === "Tests/ApiTests.cs")?.isTestFile).toBe(
      true
    );
    expect(result.nodes.some((node) => node.relativePath.includes("/obj/"))).toBe(false);
  });
});
