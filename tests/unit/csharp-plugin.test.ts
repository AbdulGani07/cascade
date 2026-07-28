import path from "node:path";
import { describe, expect, it } from "vitest";
import { createCSharpPlugin, extractCSharpDependencies } from "@cascade/language-csharp";

describe("C# language plugin", () => {
  it("extracts normal, global, static, and aliased using directives from the syntax tree", () => {
    const result = extractCSharpDependencies(
      "src/App.cs",
      `global using System.Text;
using Acme.Core;
using static Acme.Core.Constants;
using Models = Acme.Contracts.Models;

namespace Acme.App;
public class App { private readonly Acme.Core.Greeter value = new Acme.Core.Greeter(); }
`
    );
    expect(result.dependencies.map((dependency) => dependency.specifier)).toEqual([
      "System.Text",
      "Acme.Core",
      "Acme.Core.Constants",
      "Acme.Contracts.Models",
      "Acme.Core.Greeter",
    ]);
    expect(
      result.dependencies.slice(0, 4).every((dependency) => dependency.confidence === 0.98)
    ).toBe(true);
    expect(result.dependencies[4]?.confidence).toBe(0.88);
    expect(result.dependencies[0]?.evidence?.[0]).toContain("global using");
    expect(result.dependencies[2]?.evidence?.[0]).toContain("static using");
  });

  it("preserves parser diagnostics and detects test/generated files", () => {
    const plugin = createCSharpPlugin();
    const parsed = plugin.parser.parse({
      filePath: "Broken.cs",
      relativePath: "Broken.cs",
      content: "namespace Broken { public class Missing {",
    });
    expect(parsed.status).toBe("partial");
    expect(parsed.diagnostics.some((diagnostic) => diagnostic.code === "CS_PARSE_ERROR")).toBe(
      true
    );
    expect(plugin.testFileDetector?.isTestFile("", "tests/ApiTests.cs")).toBe(true);
    expect(
      plugin.generatedFileDetector?.isGeneratedFile("", "obj/Debug/App.g.cs", "// generated")
    ).toBe(true);
  });

  it("resolves source namespaces and classifies framework/unresolved dependencies", () => {
    const plugin = createCSharpPlugin();
    const root = path.resolve("tests/fixtures/csharp/dotnet-solution");
    const base = {
      importerFilePath: path.join(root, "src/App/Program.cs"),
      importerRelativePath: "src/App/Program.cs",
      projectRoot: root,
      allKnownFiles: ["src/App/Program.cs", "src/Core/Greeter.cs"],
      extractedDependency: {
        specifier: "",
        importKind: "static" as const,
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
      },
    };
    expect(
      plugin.moduleResolver.resolveModule({ ...base, specifier: "Cascade.Core" })
    ).toMatchObject({
      resolutionStatus: "resolved",
      dependencyCategory: "internal",
    });
    expect(
      plugin.moduleResolver.resolveModule({ ...base, specifier: "System.Text" })
    ).toMatchObject({
      resolutionStatus: "external",
      dependencyCategory: "standard-library",
    });
    expect(
      plugin.moduleResolver.resolveModule({ ...base, specifier: "Unknown.Library" })
    ).toMatchObject({
      resolutionStatus: "unresolved",
      dependencyCategory: "unresolved",
    });
  });
});
