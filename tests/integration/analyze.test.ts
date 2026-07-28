import { describe, it, expect } from "vitest";
import path from "node:path";
import { analyze, toJson } from "../../packages/core/src/index.js";

describe("Integration: analyze(test-project)", () => {
  const testProjectDir = path.resolve(process.cwd(), "test-project");

  it("scans test-project and produces a valid analysis result", () => {
    const result = analyze(testProjectDir);

    expect(result).toBeDefined();
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.entryPoints.length).toBeGreaterThan(0);

    const jsonStr = toJson(result);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.version).toBe("2.0");
    expect(Array.isArray(parsed.nodes)).toBe(true);
    expect(Array.isArray(parsed.edges)).toBe(true);

    // Verify relative paths in exported JSON schema
    parsed.nodes.forEach((node: { id: string }) => {
      expect(node.id).not.toContain("\\");
      expect(path.isAbsolute(node.id)).toBe(false);
    });
  });
});
