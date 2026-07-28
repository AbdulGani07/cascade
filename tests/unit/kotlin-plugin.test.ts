import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KotlinLanguagePlugin } from "../../packages/language-kotlin/src/index.js";

const fixture = path.resolve("tests/fixtures/jvm/gradle-android");

describe("Kotlin language plugin", () => {
  const plugin = new KotlinLanguagePlugin();

  it("parses imports structurally and preserves aliases", () => {
    const relativePath = "app/src/main/kotlin/com/acme/app/Main.kt";
    const filePath = path.join(fixture, relativePath);
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = plugin.parser.parse({ filePath, relativePath, content }) as { status: string };
    expect(parsed.status).toBe("success");
    const extracted = plugin.dependencyExtractor.extractDependencies({
      filePath,
      relativePath,
      content,
    }) as {
      dependencies: Array<{ specifier: string; evidence?: string[] }>;
    };
    expect(extracted.dependencies.map((item) => item.specifier)).toEqual([
      "com.acme.shared.Platform",
      "kotlin.collections.List",
    ]);
    expect(extracted.dependencies[0].evidence).toContain("Tree-sitter Kotlin import node");
  });

  it("resolves cross-project Kotlin types and detects Gradle metadata", async () => {
    const resolution = plugin.moduleResolver.resolveModule({
      specifier: "com.acme.shared.Platform",
      importerFilePath: path.join(fixture, "app/src/main/kotlin/com/acme/app/Main.kt"),
      importerRelativePath: "app/src/main/kotlin/com/acme/app/Main.kt",
      projectRoot: fixture,
      extractedDependency: {
        specifier: "com.acme.shared.Platform",
        importKind: "static",
        isStatic: true,
        isDynamic: false,
        isTypeOnly: false,
        isReExport: false,
        isConditional: false,
      },
      allKnownFiles: [
        "shared/src/commonMain/kotlin/com/acme/shared/Platform.kt",
        "app/src/main/kotlin/com/acme/app/Main.kt",
      ],
    }) as { resolutionStatus: string };
    expect(resolution.resolutionStatus).toBe("resolved");
    const metadata = await plugin.frameworkMetadata!.detectMetadata(fixture, []);
    expect(metadata.map((item) => item.frameworkName)).toContain("Android");
    expect(metadata.map((item) => item.frameworkName)).toContain("Kotlin Multiplatform");
  });

  it("detects main, source-set tests, and generated sources", async () => {
    const hints = await plugin.entryPointHints!.detectEntryPoints(fixture, [
      "app/src/main/kotlin/com/acme/app/Main.kt",
    ]);
    expect(hints).toHaveLength(1);
    expect(plugin.testFileDetector!.isTestFile("", "shared/src/commonTest/kotlin/X.kt")).toBe(true);
    expect(plugin.generatedFileDetector!.isGeneratedFile("", "build/generated/ksp/Foo.kt")).toBe(
      true
    );
  });

  it("preserves parse and unresolved-import diagnostics", () => {
    const parsed = plugin.parser.parse({
      filePath: "Broken.kt",
      relativePath: "Broken.kt",
      content: "fun broken( {",
    }) as { diagnostics: Array<{ code?: string }> };
    expect(parsed.diagnostics.some((item) => item.code === "KOTLIN_PARSE_ERROR")).toBe(true);
    const resolution = plugin.moduleResolver.resolveModule({
      specifier: "missing.vendor.Type",
      importerFilePath: path.join(fixture, "Broken.kt"),
      importerRelativePath: "Broken.kt",
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
    expect(resolution.diagnostics?.[0]?.code).toBe("KOTLIN_UNRESOLVED_IMPORT");
  });
});
