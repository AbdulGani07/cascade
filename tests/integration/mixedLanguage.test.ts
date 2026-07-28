import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { analyze } from "@cascade/core";

describe("Mixed Language Integration Analysis", () => {
  it("analyzes a mixed JS/TS repository with cross-language edges deterministically", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "cascade-mixed-lang-"));

    const srcDir = path.join(tempDir, "src");
    fs.mkdirSync(srcDir, { recursive: true });

    // JS Entry Point importing TS module
    fs.writeFileSync(
      path.join(srcDir, "index.js"),
      `import { calculateTotal } from "./calculator.ts";
       console.log(calculateTotal(10, 20));`
    );

    // TS Module importing JS helper
    fs.writeFileSync(
      path.join(srcDir, "calculator.ts"),
      `import { formatCurrency } from "./formatter.js";
       export function calculateTotal(a: number, b: number): string {
         return formatCurrency(a + b);
       }`
    );

    // JS Helper
    fs.writeFileSync(
      path.join(srcDir, "formatter.js"),
      `export function formatCurrency(val) {
         return "$" + val;
       }`
    );

    // Unreachable Dead File
    fs.writeFileSync(path.join(srcDir, "orphan.ts"), `export const unused = 42;`);

    const result1 = analyze(tempDir);
    const result2 = analyze(tempDir);

    // 1. Deterministic output verification
    expect(result1.nodes.length).toBe(result2.nodes.length);
    expect(result1.edges.length).toBe(result2.edges.length);

    // 2. Cross-language edge detection
    const jsToTsEdge = result1.edges.find(
      (e) => e.from === "src/index.js" && e.to === "src/calculator.ts"
    );
    expect(jsToTsEdge).toBeDefined();
    expect(jsToTsEdge?.edgeType).toBe("cross-language");

    const tsToJsEdge = result1.edges.find(
      (e) => e.from === "src/calculator.ts" && e.to === "src/formatter.js"
    );
    expect(tsToJsEdge).toBeDefined();
    expect(tsToJsEdge?.edgeType).toBe("cross-language");

    // 3. Dead code detection
    expect(result1.deadFiles).toContain("src/orphan.ts");

    // Clean up
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});
