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
    expect(manifest).toContain("github.action_ref || github.sha");
    expect(manifest).not.toContain("hashFiles(format(");
    expect(manifest).toContain("corepack prepare pnpm@9.15.0 --activate");
    expect(manifest).toContain("pnpm install --frozen-lockfile --ignore-scripts");
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

  it("packages release candidates locally and authenticates the secret scanner", () => {
    const ci = fs.readFileSync(path.join(root, ".github/workflows/ci.yml"), "utf8");
    const cascadeWorkflow = fs.readFileSync(
      path.join(root, ".github/workflows/cascade-pr.yml"),
      "utf8"
    );
    const security = fs.readFileSync(path.join(root, ".github/workflows/security.yml"), "utf8");
    const packager = fs.readFileSync(
      path.join(root, "packages/vscode-extension/scripts/package.mjs"),
      "utf8"
    );
    expect(ci).toMatch(/vscode-package:[\s\S]*?CASCADE_RELEASE_CANDIDATE: "true"/);
    expect(cascadeWorkflow).toMatch(/path: \.cascade-artifacts[\s\S]*?include-hidden-files: true/);
    expect(security).toMatch(
      /gitleaks\/gitleaks-action@[0-9a-f]{40}[\s\S]*?GITHUB_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/
    );
    expect(packager).toContain("::error title=VSIX package validation failed::");
  });
});
