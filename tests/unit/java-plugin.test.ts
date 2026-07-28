import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { JavaLanguagePlugin } from "../../packages/language-java/src/index.js";

const fixture = path.resolve("tests/fixtures/jvm/maven-multi");

describe("Java language plugin", () => {
  const plugin = new JavaLanguagePlugin();

  it("uses a structured syntax tree and extracts normal and static imports", () => {
    const relativePath = "app/src/main/java/com/acme/app/Application.java";
    const filePath = path.join(fixture, relativePath);
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = plugin.parser.parse({ filePath, relativePath, content });
    expect(parsed).not.toBeInstanceOf(Promise);
    expect((parsed as { status: string }).status).toBe("success");
    const extracted = plugin.dependencyExtractor.extractDependencies({
      filePath,
      relativePath,
      content,
    });
    expect(
      (extracted as { dependencies: Array<{ specifier: string }> }).dependencies.map(
        (item) => item.specifier
      )
    ).toEqual(["com.acme.api.Greeting", "java.util.List", "java.util.Objects.requireNonNull"]);
  });

  it("resolves a multi-module source type and identifies platform imports", () => {
    const internal = plugin.moduleResolver.resolveModule({
      specifier: "com.acme.api.Greeting",
      importerFilePath: path.join(fixture, "app/src/main/java/com/acme/app/Application.java"),
      importerRelativePath: "app/src/main/java/com/acme/app/Application.java",
      projectRoot: fixture,
      extractedDependency: {
        specifier: "com.acme.api.Greeting",
        importKind: "static",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
      },
      allKnownFiles: [
        "api/src/main/java/com/acme/api/Greeting.java",
        "app/src/main/java/com/acme/app/Application.java",
      ],
    });
    expect((internal as { resolutionStatus: string }).resolutionStatus).toBe("resolved");
  });

  it("detects main methods, JUnit conventions, and generated sources", async () => {
    const hints = await plugin.entryPointHints!.detectEntryPoints(fixture, [
      "app/src/main/java/com/acme/app/Application.java",
    ]);
    expect(hints[0]?.reason).toContain("Spring Boot");
    expect(plugin.testFileDetector!.isTestFile("", "app/src/test/java/ApplicationTest.java")).toBe(
      true
    );
    expect(plugin.generatedFileDetector!.isGeneratedFile("", "build/generated/Foo.java")).toBe(
      true
    );
  });

  it("preserves parse and unresolved-import diagnostics", () => {
    const parsed = plugin.parser.parse({
      filePath: "Broken.java",
      relativePath: "Broken.java",
      content: "class Broken { void run( {",
    }) as { diagnostics: Array<{ code?: string }> };
    expect(parsed.diagnostics.some((item) => item.code === "JAVA_PARSE_ERROR")).toBe(true);
    const resolution = plugin.moduleResolver.resolveModule({
      specifier: "missing.vendor.Type",
      importerFilePath: path.join(fixture, "Broken.java"),
      importerRelativePath: "Broken.java",
      projectRoot: fixture,
      extractedDependency: {
        specifier: "missing.vendor.Type",
        importKind: "static",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
      },
      allKnownFiles: [],
    }) as { resolutionStatus: string; diagnostics?: Array<{ code?: string }> };
    expect(resolution.resolutionStatus).toBe("unresolved");
    expect(resolution.diagnostics?.[0]?.code).toBe("JAVA_UNRESOLVED_IMPORT");
  });
});
