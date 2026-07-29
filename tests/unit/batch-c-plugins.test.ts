import { describe, expect, it } from "vitest";
import {
  createLuaPlugin,
  createPowerShellPlugin,
  createRPlugin,
  createShellPlugin,
} from "@cascade-code/language-expanded";

describe("Batch C language plugins", () => {
  it.each([
    [createShellPlugin, `source "./lib/common.sh"`, "./lib/common.sh"],
    [
      createPowerShellPlugin,
      `Import-Module "./Modules (Local)/Tools.psm1"`,
      "./Modules (Local)/Tools.psm1",
    ],
    [createLuaPlugin, `local service = require("service")`, "service"],
    [createRPlugin, `source("./helpers.R")`, "./helpers.R"],
  ])("extracts dependencies from structured tokens", (factory, source, expected) => {
    const plugin = factory();
    const context = {
      filePath: `sample${plugin.supportedExtensions[0]}`,
      relativePath: `sample${plugin.supportedExtensions[0]}`,
      content: source,
    };
    const parsed = plugin.parser.parse(context);
    if (parsed instanceof Promise) throw new Error("unexpected async parser");
    const result = plugin.dependencyExtractor.extractDependencies({ ...context, ast: parsed.ast });
    if (result instanceof Promise) throw new Error("unexpected async extractor");
    expect(result.dependencies).toContainEqual(expect.objectContaining({ specifier: expected }));
    expect(plugin.limitations.knownIssues.length).toBeGreaterThan(0);
  });

  it("does not claim full semantic analysis", () => {
    for (const plugin of [
      createShellPlugin(),
      createPowerShellPlugin(),
      createLuaPlugin(),
      createRPlugin(),
    ])
      expect(plugin.limitations.unsupportedFeatures).toContain(
        "Full compiler or runtime semantic evaluation"
      );
  });
});
