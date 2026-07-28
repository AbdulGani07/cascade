import { describe, expect, it } from "vitest";
import { extractScriptDependencies } from "@cascade/language-javascript";

describe("compiler-AST dependency extraction", () => {
  it("extracts ESM, CommonJS, type-only, references, workers, and assets", () => {
    const source = `
      /// <reference types="node" />
      import value from "./value.js";
      import type { Model } from "./model.js";
      import "./theme.css";
      export { value as renamed } from "./other.js";
      export type { Shape } from "./shape.js";
      export * from "./barrel.js";
      import legacy = require("./legacy.cjs");
      const lazy = import("./lazy.js");
      const common = require("./common.cjs");
      const resolved = require.resolve("./resolved.js");
      const worker = new Worker(new URL("./worker.ts", import.meta.url));
      module.exports = { common };
      exports.legacy = legacy;
    `;
    const result = extractScriptDependencies("src/index.ts", "src/index.ts", source);
    const bySpecifier = new Map(
      result.dependencies.map((dependency) => [dependency.specifier, dependency])
    );

    expect(bySpecifier.get("./model.js")?.isTypeOnly).toBe(true);
    expect(bySpecifier.get("./shape.js")?.isTypeOnly).toBe(true);
    expect(bySpecifier.get("./barrel.js")?.isReExport).toBe(true);
    expect(bySpecifier.get("./lazy.js")?.isDynamic).toBe(true);
    expect(bySpecifier.get("./common.cjs")?.importKind).toBe("static");
    expect(bySpecifier.get("./resolved.js")?.importKind).toBe("reference");
    expect(bySpecifier.get("./worker.ts")?.isDynamic).toBe(true);
    expect(bySpecifier.get("./theme.css")?.importKind).toBe("side-effect");
    expect(bySpecifier.get("node")?.isTypeOnly).toBe(true);
    expect(result.diagnostics).toHaveLength(0);
  });

  it("returns partial dependencies and parse diagnostics for malformed source", () => {
    const result = extractScriptDependencies(
      "broken.ts",
      "broken.ts",
      `import "./valid.js"; function broken( {`
    );
    expect(result.dependencies.some((dependency) => dependency.specifier === "./valid.js")).toBe(
      true
    );
    expect(result.diagnostics.length).toBeGreaterThan(0);
  });
});
