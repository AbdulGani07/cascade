import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeGitImpact } from "@cascade-code/core";
import { defaultConfig } from "@cascade-code/config";

const repositories: string[] = [];
afterEach(() => {
  for (const repository of repositories.splice(0))
    fs.rmSync(repository, { recursive: true, force: true });
});

function fixture(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cascade-git-impact-"));
  repositories.push(root);
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
  git("init");
  git("config", "user.email", "cascade@example.test");
  git("config", "user.name", "Cascade Test");
  fs.mkdirSync(path.join(root, "src"), { recursive: true });
  fs.mkdirSync(path.join(root, "tests"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ name: "git-impact-fixture", type: "module" })
  );
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  fs.writeFileSync(
    path.join(root, "src", "b.ts"),
    'import { a } from "./a"; export const b = a;\n'
  );
  fs.writeFileSync(
    path.join(root, "tests", "a.test.ts"),
    'import { a } from "../src/a"; test("a", () => a);\n'
  );
  git("add", ".");
  git("commit", "-m", "base");
  return root;
}

describe("Git change impact", () => {
  it("reports working-tree files, symbols, dependents, tests, cycles, and transparent risk", () => {
    const root = fixture();
    fs.writeFileSync(
      path.join(root, "src", "a.ts"),
      'import { b } from "./b"; export const a = b;\n'
    );
    const report = analyzeGitImpact(root, {
      base: "HEAD",
      config: {
        ...defaultConfig,
        gitImpact: {
          ...defaultConfig.gitImpact,
          testMappings: { "src/a.ts": ["tests/a.test.ts"] },
          criticalPaths: ["src/"],
        },
      },
    });
    expect(report.comparisonMode).toBe("working-tree");
    expect(report.changedFiles).toContainEqual(
      expect.objectContaining({ path: "src/a.ts", kind: "modified" })
    );
    expect(report.affected.some((item) => item.id === "src/b.ts")).toBe(true);
    expect(report.affectedTests).toContainEqual(expect.objectContaining({ id: "tests/a.test.ts" }));
    expect(report.introducedCycles.length).toBeGreaterThan(0);
    expect(report.risk.contributions.some((item) => item.factor === "introducedCycles")).toBe(true);
  }, 15_000);

  it("preserves renamed and deleted Git status evidence", () => {
    const root = fixture();
    const git = (...args: string[]) =>
      execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
    fs.renameSync(path.join(root, "src", "a.ts"), path.join(root, "src", "renamed.ts"));
    fs.rmSync(path.join(root, "src", "b.ts"));
    git("add", "-A");
    const report = analyzeGitImpact(root, { base: "HEAD" });
    expect(report.changedFiles).toContainEqual(
      expect.objectContaining({ kind: "renamed", previousPath: "src/a.ts", path: "src/renamed.ts" })
    );
    expect(report.changedFiles).toContainEqual(
      expect.objectContaining({ kind: "deleted", path: "src/b.ts" })
    );
  });

  it("compares two committed snapshots and reports removed cycles", () => {
    const root = fixture();
    const git = (...args: string[]) =>
      execFileSync("git", ["-C", root, ...args], { encoding: "utf8" });
    fs.writeFileSync(
      path.join(root, "src", "a.ts"),
      'import { b } from "./b"; export const a = b;\n'
    );
    git("add", ".");
    git("commit", "-m", "add cycle");
    const cycleCommit = git("rev-parse", "HEAD").trim();
    fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
    git("add", ".");
    git("commit", "-m", "remove cycle");
    const report = analyzeGitImpact(root, { base: cycleCommit, head: "HEAD" });
    expect(report.comparisonMode).toBe("commit");
    expect(report.removedCycles.length).toBeGreaterThan(0);
  });
});
