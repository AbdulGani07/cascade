import { describe, it, expect } from "vitest";
import path from "node:path";
import { execSync } from "node:child_process";

describe("E2E CLI Smoke Test", () => {
  const cliBin = path.resolve(process.cwd(), "packages/cli/dist/index.js");
  const testProjectDir = path.resolve(process.cwd(), "test-project");

  it("executes 'cascade analyze --json' and outputs canonical JSON", () => {
    const output = execSync(`node "${cliBin}" analyze "${testProjectDir}" --json`, {
      encoding: "utf-8",
    });

    const parsed = JSON.parse(output);
    expect(parsed.version).toBe("2.0");
    expect(Array.isArray(parsed.nodes)).toBe(true);
    expect(Array.isArray(parsed.edges)).toBe(true);
  });

  it("executes 'cascade graph --json' and outputs graph payload", () => {
    const output = execSync(`node "${cliBin}" graph "${testProjectDir}" --json`, {
      encoding: "utf-8",
    });

    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed.nodes)).toBe(true);
    expect(Array.isArray(parsed.edges)).toBe(true);
  });

  it("executes 'cascade deadcode --json' and outputs dead files array", () => {
    const output = execSync(`node "${cliBin}" deadcode "${testProjectDir}" --json`, {
      encoding: "utf-8",
    });

    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
  });
});
