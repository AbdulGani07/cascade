import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const manifest = JSON.parse(
  readFileSync(path.join(root, "benchmarks/real-repositories.json"), "utf8")
);
const workflow = readFileSync(
  path.join(root, ".github/workflows/real-world-validation.yml"),
  "utf8"
);
const runner = readFileSync(path.join(root, "scripts/validate-real-repositories.mjs"), "utf8");

describe("real-world validation corpus", () => {
  it("pins eight unique HTTPS repositories and records permissive licenses", () => {
    expect(manifest.repositories).toHaveLength(8);
    expect(new Set(manifest.repositories.map((entry: { id: string }) => entry.id)).size).toBe(8);
    for (const entry of manifest.repositories) {
      expect(entry.repository).toMatch(/^https:\/\/github\.com\/[^/]+\/[^/]+$/);
      expect(entry.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(entry.license).toMatch(/MIT|BSD-3-Clause|Apache-2\.0|CC-BY-4\.0|Unlicense/);
    }
  });

  it("is scheduled/manual only and pins every action", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("schedule:");
    expect(workflow).not.toMatch(/^\s+(?:push|pull_request):/m);
    for (const use of workflow.matchAll(/^\s*- uses:\s*([^\s#]+)/gm)) {
      expect(use[1]).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it("uses archive-only static analysis and contains no repository tool execution", () => {
    expect(runner).toContain("codeload.github.com");
    expect(runner).not.toMatch(/\bgit\s+clone\b/);
    expect(runner).not.toMatch(/execFileSync\([^\n]+(?:gradle|maven|mvn|cargo|cmake|msbuild)/i);
    expect(runner).toContain("process.execPath");
  });

  it("bounds compressed downloads, decompression, entry size, and file count", () => {
    for (const limit of [
      "MAX_ARCHIVE_BYTES",
      "MAX_EXTRACTED_BYTES",
      "MAX_ARCHIVE_FILE_BYTES",
      "MAX_ARCHIVE_FILES",
    ])
      expect(runner).toContain(limit);
    expect(runner).toContain("maxOutputLength");
    expect(runner).toContain("response.body?.getReader()");
  });
});
