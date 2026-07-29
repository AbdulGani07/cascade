import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "@cascade-code/core";

describe("Batch C integration", () => {
  it("resolves literal script and module paths including PowerShell special characters", () => {
    const result = analyze(path.resolve("tests/fixtures/batch-c"));
    expect([...new Set(result.nodes.map((node) => node.language))]).toEqual(
      expect.arrayContaining(["shell", "powershell", "lua", "r"])
    );
    for (const specifier of [
      "./lib/common.sh",
      "./Modules (Local)/Tools.psm1",
      "./service",
      "./helpers.R",
    ])
      expect(result.edges).toContainEqual(
        expect.objectContaining({ extractedText: specifier, resolutionStatus: "resolved" })
      );
  });
});
