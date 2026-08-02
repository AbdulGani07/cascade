import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PUBLIC_PACKAGE_NAMES } from "../../scripts/validate-version-state.mjs";
import { evaluatePublishPreconditions } from "../../scripts/validate-vscode-publish.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const workflow = readFileSync(path.join(root, ".github/workflows/publish-vscode.yml"), "utf8");

describe("VS Code publication workflow", () => {
  it("is manually dispatched, main-only, dry by default, and pins every action", () => {
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("default: true");
    expect(workflow).toContain("github.repository == 'AbdulGani07/cascade'");
    expect(workflow).toContain("github.ref == 'refs/heads/main'");
    expect(workflow).not.toMatch(/^\s+(?:push|pull_request):/m);
    for (const use of workflow.matchAll(/^\s*- uses:\s*([^\s#]+)/gm)) {
      expect(use[1]).toMatch(/@[0-9a-f]{40}$/);
    }
  });

  it("isolates the Marketplace token to the protected publish step", () => {
    expect(workflow.match(/secrets\.VSCE_PAT/g)).toHaveLength(1);
    expect(workflow).toContain("environment: vscode-marketplace");
    expect(workflow).toContain("if: inputs.dry-run == false");
    expect(workflow).not.toContain("--skip-duplicate");
  });

  it("validates and publishes downloaded VSIX files through absolute workspace paths", () => {
    expect(workflow).toContain('VSIX_DIR="${GITHUB_WORKSPACE}/release-vsix"');
    expect(workflow).toContain(
      "find \"$VSIX_DIR\" -maxdepth 1 -type f -name '*.vsix' -print | sort"
    );
    expect(workflow).toContain('test "${#VSIX_FILES[@]}" -eq 6');
    expect(workflow).toContain(
      "TARGETS=(darwin-arm64 darwin-x64 linux-arm64 linux-x64 win32-arm64 win32-x64)"
    );
    expect(workflow).toContain('unzip -tqq "$VSIX_FILE"');
    expect(workflow).toContain('node scripts/check-vsix-size.mjs "${VSIX_FILES[@]}"');
    expect(workflow).toContain(
      'pnpm --filter "cascade-code-intelligence" exec vsce publish --packagePath "${VSIX_FILES[@]}"'
    );
    expect(workflow).not.toContain("find release-vsix");
  });

  it("rejects an existing Marketplace prerelease", () => {
    const npmTags = Object.fromEntries(
      PUBLIC_PACKAGE_NAMES.map((name) => [name, { next: "3.3.1-next.0" }])
    );
    const failures = evaluatePublishPreconditions({
      channel: "prerelease",
      source: { publicVersion: "3.3.1-next.0", vscodeVersion: "3.3.1" },
      npmTags,
      marketplaceVersions: [{ version: "3.3.1", channel: "prerelease" }],
      releases: [],
    });
    expect(failures.join("\n")).toContain("already exists");
  });

  it("rejects a Marketplace numeric version occupied by the other channel", () => {
    const npmTags = Object.fromEntries(
      PUBLIC_PACKAGE_NAMES.map((name) => [name, { latest: "3.3.0" }])
    );
    const failures = evaluatePublishPreconditions({
      channel: "stable",
      source: { publicVersion: "3.3.1", vscodeVersion: "3.3.1" },
      npmTags,
      marketplaceVersions: [{ version: "3.3.1", channel: "prerelease" }],
      releases: [],
      candidate: true,
    });
    expect(failures.join("\n")).toContain("already exists");
  });

  it("accepts a stable candidate newer than npm latest before publication", () => {
    const npmTags = Object.fromEntries(
      PUBLIC_PACKAGE_NAMES.map((name) => [name, { latest: "3.3.0" }])
    );
    expect(
      evaluatePublishPreconditions({
        channel: "stable",
        source: { publicVersion: "3.3.1", vscodeVersion: "3.3.1" },
        npmTags,
        marketplaceVersions: [{ version: "3.3.0", channel: "prerelease" }],
        releases: [],
        candidate: true,
      })
    ).toEqual([]);
  });

  it("rejects a stable Marketplace version that npm latest or GitHub Releases do not match", () => {
    const npmTags = Object.fromEntries(
      PUBLIC_PACKAGE_NAMES.map((name) => [name, { latest: "3.3.0" }])
    );
    const failures = evaluatePublishPreconditions({
      channel: "stable",
      source: { publicVersion: "3.3.1", vscodeVersion: "3.3.1" },
      npmTags,
      marketplaceVersions: [],
      releases: [],
    });
    expect(failures.join("\n")).toContain("npm latest");
    expect(failures.join("\n")).toContain("GitHub Release v3.3.1");
  });
});
