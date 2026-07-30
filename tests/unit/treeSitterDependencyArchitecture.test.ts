import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

interface PackageManifest {
  dependencies?: Record<string, string>;
}

function manifest(packageDirectory: string): PackageManifest {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), packageDirectory, "package.json"), "utf8")
  ) as PackageManifest;
}

describe("Tree-sitter dependency architecture", () => {
  it("keeps parser runtimes inside language-plugin boundaries", () => {
    expect(manifest(".").dependencies).not.toHaveProperty("tree-sitter");
    expect(manifest("packages/core").dependencies).not.toHaveProperty("tree-sitter");
    expect(manifest("packages/core").dependencies).not.toHaveProperty("tree-sitter-javascript");
    expect(manifest("packages/core").dependencies).not.toHaveProperty("tree-sitter-typescript");
  });

  it.each([
    ["packages/language-javascript", "^0.21.1", "tree-sitter-javascript", "^0.23.1"],
    ["packages/language-typescript", "^0.21.1", "tree-sitter-typescript", "^0.23.2"],
    ["packages/language-c", "^0.22.4", "tree-sitter-c", "0.23.6"],
    ["packages/language-cpp", "^0.21.1", "tree-sitter-cpp", "0.23.2"],
    ["packages/language-csharp", "^0.21.1", "tree-sitter-c-sharp", "0.23.1"],
    ["packages/language-go", "^0.21.1", "tree-sitter-go", "^0.23.4"],
    ["packages/language-java", "^0.21.1", "tree-sitter-java", "^0.23.5"],
    ["packages/language-kotlin", "^0.22.4", "@tree-sitter-grammars/tree-sitter-kotlin", "^1.1.0"],
    ["packages/language-rust", "^0.22.4", "tree-sitter-rust", "^0.24.0"],
  ])(
    "pins a declared-compatible runtime and grammar in %s",
    (directory, runtimeRange, grammar, grammarRange) => {
      const dependencies = manifest(directory).dependencies;
      expect(dependencies?.["tree-sitter"]).toBe(runtimeRange);
      expect(dependencies?.[grammar]).toBe(grammarRange);
    }
  );

  it("makes clean tarball validation reject invalid npm dependency trees", () => {
    const validator = fs.readFileSync(
      path.join(process.cwd(), "scripts", "validate-release.mjs"),
      "utf8"
    );
    expect(validator).toContain('runPackageManager("npm", ["ls", "--all"]');
  });
});
