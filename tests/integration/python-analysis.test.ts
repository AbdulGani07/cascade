import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyze } from "@cascade/core";

const roots: string[] = [];
function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cascade-python-"));
  roots.push(root);
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}
afterEach(() =>
  roots.splice(0).forEach((root) => fs.rmSync(root, { recursive: true, force: true }))
);

describe("Python project analysis", () => {
  it("resolves src-layout packages and classifies dependency kinds", () => {
    const root = fixture({
      "pyproject.toml": '[project]\nname="demo"\ndependencies=["fastapi>=0.100"]',
      "src/demo/__init__.py": "",
      "src/demo/__main__.py": "from .api import app\nimport os\nimport fastapi\nimport missing_pkg",
      "src/demo/api.py": "from fastapi import FastAPI\napp = FastAPI()",
    });
    const result = analyze(root);
    expect(result.nodes.filter((node) => node.language === "python")).toHaveLength(3);
    expect(result.edges.find((edge) => edge.extractedText === ".api")).toMatchObject({
      resolutionStatus: "resolved",
      dependencyCategory: "internal",
    });
    expect(result.edges.find((edge) => edge.extractedText === "os")?.dependencyCategory).toBe(
      "standard-library"
    );
    expect(result.edges.find((edge) => edge.extractedText === "fastapi")?.dependencyCategory).toBe(
      "external"
    );
    expect(
      result.edges.find((edge) => edge.extractedText === "missing_pkg")?.resolutionStatus
    ).toBe("unresolved");
    expect(result.entryPoints).toContain("src/demo/__main__.py");
    expect(result.projects?.[0]?.frameworks).toContain("FastAPI");
  });
});
