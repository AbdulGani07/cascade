import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  PRIVATE_VERSION_POLICY_NAMES,
  PUBLIC_PACKAGE_NAMES,
  validateVersionState,
} from "../../scripts/validate-version-state.mjs";

const roots: string[] = [];

function writeJson(file: string, value: unknown) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function fixture(mode: "stable" | "next") {
  const root = mkdtempSync(path.join(tmpdir(), "cascade-version-state-"));
  roots.push(root);
  const rootVersion = "3.3.0";
  const publicVersion = mode === "next" ? "3.3.1-next.0" : rootVersion;
  writeJson(path.join(root, "package.json"), {
    name: "@cascade-code/monorepo",
    private: true,
    version: rootVersion,
  });
  for (const [index, name] of PUBLIC_PACKAGE_NAMES.entries()) {
    const directory = `public-${index}`;
    writeJson(path.join(root, "packages", directory, "package.json"), {
      name,
      version: publicVersion,
    });
    writeFileSync(
      path.join(root, "packages", directory, "CHANGELOG.md"),
      `# Changelog\n\n## ${publicVersion}\n`
    );
  }
  for (const [index, name] of PRIVATE_VERSION_POLICY_NAMES.entries()) {
    writeJson(path.join(root, "packages", `private-${index}`, "package.json"), {
      name,
      private: true,
      version: rootVersion,
    });
  }
  writeJson(path.join(root, "packages", "vscode-extension", "package.json"), {
    name: "cascade-code-intelligence",
    private: true,
    version: mode === "next" ? "3.3.1" : rootVersion,
  });
  writeFileSync(
    path.join(root, "packages", "vscode-extension", "CHANGELOG.md"),
    `# Changelog\n\n## ${mode === "next" ? "3.3.1" : rootVersion}\n`
  );
  if (mode === "next") {
    writeJson(path.join(root, ".changeset", "pre.json"), {
      mode: "pre",
      tag: "next",
      initialVersions: Object.fromEntries(PUBLIC_PACKAGE_NAMES.map((name) => [name, rootVersion])),
      changesets: ["fixture"],
    });
  }
  return root;
}

function manifestFor(root: string, packageName: string) {
  for (const directory of readdirSync(path.join(root, "packages"))) {
    const file = path.join(root, "packages", directory, "package.json");
    try {
      const manifest = JSON.parse(readFileSync(file, "utf8"));
      if (manifest.name === packageName) return { file, manifest };
    } catch {
      // Continue searching fixture manifests.
    }
  }
  throw new Error(`missing fixture package ${packageName}`);
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("release version state", () => {
  it("accepts a stable release state", () => {
    expect(validateVersionState(fixture("stable"), { channel: "stable" }).failures).toEqual([]);
  });

  it("accepts a next prerelease state", () => {
    expect(validateVersionState(fixture("next"), { channel: "prerelease" }).failures).toEqual([]);
  });

  it("rejects a mismatched public package version", () => {
    const root = fixture("next");
    const target = manifestFor(root, "@cascade-code/core");
    writeJson(target.file, { ...target.manifest, version: "3.3.1-next.1" });
    expect(validateVersionState(root).failures.join("\n")).toContain("lockstep");
  });

  it("rejects the wrong Marketplace version", () => {
    const root = fixture("next");
    const target = manifestFor(root, "cascade-code-intelligence");
    writeJson(target.file, { ...target.manifest, version: "3.3.0" });
    expect(validateVersionState(root).failures.join("\n")).toContain("Marketplace version");
  });

  it("rejects missing Changesets prerelease metadata", () => {
    const root = fixture("next");
    rmSync(path.join(root, ".changeset", "pre.json"));
    expect(validateVersionState(root).failures.join("\n")).toContain("pre.json");
  });

  it("rejects accidental stable publication from prerelease source", () => {
    const result = validateVersionState(fixture("next"), { channel: "stable" });
    expect(result.failures.join("\n")).toContain("stable publication rejected");
  });
});
