import { describe, expect, it } from "vitest";
import {
  createDartPlugin,
  createPhpPlugin,
  createRubyPlugin,
  createSwiftPlugin,
} from "@cascade/language-expanded";

const context = (content: string, extension: string) => ({
  filePath: `sample${extension}`,
  relativePath: `sample${extension}`,
  content,
});

describe("Batch B language plugins", () => {
  it.each([
    [
      createPhpPlugin,
      `require "./bootstrap.php"; use Acme.Services;`,
      ["./bootstrap.php", "Acme.Services"],
    ],
    [createRubyPlugin, `require_relative "./service"\nrequire "json"`, ["./service", "json"]],
    [createSwiftPlugin, `import Foundation\nimport CascadeCore`, ["Foundation", "CascadeCore"]],
    [
      createDartPlugin,
      `import "package:flutter/widgets.dart"; export "./service.dart";`,
      ["package:flutter/widgets.dart", "./service.dart"],
    ],
  ])("extracts structured dependencies and publishes limitations", (factory, source, expected) => {
    const plugin = factory();
    const parsed = plugin.parser.parse(context(source, plugin.supportedExtensions[0]));
    if (parsed instanceof Promise) throw new Error("unexpected async parser");
    expect(parsed.status).toBe("success");
    const result = plugin.dependencyExtractor.extractDependencies({
      ...context(source, plugin.supportedExtensions[0]),
      ast: parsed.ast,
    });
    if (result instanceof Promise) throw new Error("unexpected async extractor");
    expect(result.dependencies.map((item) => item.specifier)).toEqual(expected);
    expect(plugin.limitations.knownIssues.length).toBeGreaterThan(0);
    expect(plugin.analysisLevels.length).toBeGreaterThan(0);
  });

  it("preserves malformed input diagnostics", () => {
    const parsed = createRubyPlugin().parser.parse(context(`require "broken`, ".rb"));
    if (parsed instanceof Promise) throw new Error("unexpected async parser");
    expect(parsed.status).toBe("partial");
    expect(parsed.diagnostics[0]?.code).toBe("STRUCTURED_UNTERMINATED_STRING");
  });
});
