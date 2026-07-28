import path from "node:path";
import { describe, expect, it } from "vitest";
import { createRustPlugin, extractRustDependencies } from "@cascade/language-rust";

describe("Rust language plugin", () => {
  it("extracts use, extern crate, modules, re-exports, and literal include macros", () => {
    const result = extractRustDependencies(
      "src/lib.rs",
      `extern crate alloc;
mod service;
use crate::service::run;
pub use crate::models::*;
const DATA: &str = include_str!("../data.txt");
include!(concat!(env!("OUT_DIR"), "/generated.rs"));
`
    );
    expect(result.dependencies.map((dependency) => dependency.specifier)).toEqual([
      "alloc",
      "self::service",
      "crate::service::run",
      "crate::models",
      "../data.txt",
    ]);
    expect(result.dependencies.find((item) => item.specifier === "crate::models")).toMatchObject({
      isReExport: true,
      confidence: 0.85,
    });
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: "RUST_DYNAMIC_INCLUDE" })
    );
  });

  it("preserves malformed-source diagnostics and detects tests and generated files", () => {
    const plugin = createRustPlugin();
    expect(
      plugin.parser.parse({
        filePath: "broken.rs",
        relativePath: "broken.rs",
        content: "pub fn broken( {",
      })
    ).toMatchObject({ status: "partial" });
    expect(plugin.testFileDetector?.isTestFile("x.rs", "crate/tests/x.rs")).toBe(true);
    expect(
      plugin.generatedFileDetector?.isGeneratedFile(
        "client.rs",
        "src/generated/client.rs",
        "// @generated"
      )
    ).toBe(true);
  });

  it("resolves local modules, workspace crates, Cargo dependencies, std, includes, and missing paths", () => {
    const root = path.resolve("tests/fixtures/rust/workspace");
    const plugin = createRustPlugin();
    const base = {
      importerFilePath: path.join(root, "app/src/main.rs"),
      importerRelativePath: "app/src/main.rs",
      projectRoot: root,
      allKnownFiles: ["app/src/main.rs", "app/src/service.rs", "shared/src/lib.rs"],
    };
    const resolve = (specifier: string) =>
      plugin.moduleResolver.resolveModule({
        ...base,
        specifier,
        extractedDependency: {
          specifier,
          importKind: "static",
          isStatic: true,
          isDynamic: false,
          isTypeOnly: false,
          isReExport: false,
          isConditional: false,
        },
      });
    expect(resolve("self::service")).toMatchObject({
      resolutionStatus: "resolved",
      resolvedRelativePath: "app/src/service.rs",
    });
    expect(resolve("cascade_shared")).toMatchObject({
      resolutionStatus: "resolved",
      resolvedRelativePath: "shared/src/lib.rs",
    });
    expect(resolve("serde")).toMatchObject({
      resolutionStatus: "external",
      dependencyCategory: "external",
    });
    expect(resolve("std::path::Path")).toMatchObject({
      resolutionStatus: "external",
      dependencyCategory: "standard-library",
    });
    expect(resolve("unknown_crate")).toMatchObject({
      resolutionStatus: "unresolved",
      dependencyCategory: "unresolved",
    });
  });

  it("detects Cargo binary targets and publishes workspace metadata and analysis levels", () => {
    const root = path.resolve("tests/fixtures/rust/workspace");
    const plugin = createRustPlugin();
    expect(
      plugin.entryPointHints?.detectEntryPoints(root, ["app/src/main.rs", "shared/src/lib.rs"])
    ).toContainEqual(expect.objectContaining({ relativePath: "app/src/main.rs", confidence: 1 }));
    expect(
      plugin.frameworkMetadata?.detectMetadata(root, ["app/src/main.rs", "shared/src/lib.rs"])
    ).toContainEqual({
      frameworkName: "Cargo workspace",
      metadata: expect.objectContaining({
        buildSystem: "cargo",
        workspaceMembers: ["app", "shared"],
      }),
    });
    expect(
      (plugin as ReturnType<typeof createRustPlugin> & { analysisLevels: readonly string[] })
        .analysisLevels
    ).toContain("build-dependency");
  });
});
