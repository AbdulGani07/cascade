import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyze } from "../../packages/core/src/index.js";

const roots: string[] = [];

function fixture(files = 2): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cascade-performance-safety-"));
  roots.push(root);
  fs.mkdirSync(path.join(root, "src"));
  for (let index = 0; index < files; index++) {
    fs.writeFileSync(
      path.join(root, "src", `f-${index}.ts`),
      `export const v${index} = ${index};\n`
    );
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true });
});

describe("performance safety controls", () => {
  it("supports structural analysis without materializing all-pairs impact", () => {
    const result = analyze(fixture(10), { impact: "none" });
    expect(result.nodes).toHaveLength(10);
    expect(result.impact).toEqual({});
  });

  it("honors cancellation before file traversal", () => {
    const controller = new AbortController();
    controller.abort();
    expect(() => analyze(fixture(), { signal: controller.signal })).toThrow(/cancelled/i);
  });

  it("reports deterministic phase timings and computes line counts during parsing", () => {
    const phases: string[] = [];
    const result = analyze(fixture(), { onPhase: (phase) => phases.push(phase) });
    expect(result.nodes[0].metrics?.lineCount).toBe(2);
    expect(phases).toContain("fileDiscovery");
    expect(phases).toContain("parsing");
    expect(phases).toContain("moduleResolution");
    expect(phases).toContain("graphConstruction");
  });
});
