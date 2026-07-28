import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("GitHub Action contract", () => {
  it("declares the required reports, policy inputs, and composite runner", () => {
    const manifest = fs.readFileSync(path.join(root, "action.yml"), "utf8");
    expect(manifest).toContain("using: composite");
    expect(manifest).toContain("fail-on-new-cycles");
    expect(manifest).toContain("fail-on-architecture-violations");
    expect(manifest).toContain("fail-on-unresolved-internal");
    expect(manifest).toContain("actions/cache@");
    expect(manifest).toContain("sarif-path");
    expect(manifest).toContain("html-path");
  });

  it("uses validated paths and argument-array process execution", () => {
    const runner = fs.readFileSync(path.join(root, "scripts", "run-action.mjs"), "utf8");
    expect(runner).toContain("repository-relative path without '..'");
    expect(runner).toContain("spawnSync(process.execPath, [cli, ...args]");
    expect(runner).toContain("CASCADE_CONFIG_PATH");
    expect(runner).toContain('"html"');
  });
});
