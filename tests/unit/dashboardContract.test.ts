import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { viewDefinitions } from "../../packages/dashboard/src/lib/views";

describe("dashboard workspace contract", () => {
  it("exposes every analytical workspace view", () => {
    expect(viewDefinitions.map(([id]) => id)).toEqual([
      "overview",
      "projects",
      "graph",
      "packages",
      "services",
      "cycles",
      "deadcode",
      "impact",
      "pull-request",
      "tests",
      "violations",
      "unresolved",
      "languages",
      "hotspots",
      "matrix",
      "timeline",
    ]);
  });

  it("keeps repository text out of unsafe HTML injection APIs", () => {
    const sourceRoot = path.join(process.cwd(), "packages", "dashboard", "src");
    const sources = fs
      .readdirSync(path.join(sourceRoot, "components"))
      .filter((file) => file.endsWith(".tsx"))
      .map((file) => fs.readFileSync(path.join(sourceRoot, "components", file), "utf8"))
      .join("\n");
    expect(sources).not.toContain("dangerouslySetInnerHTML");
    expect(sources).toContain('role="dialog"');
    expect(sources).toContain("aria-label");
  });

  it("preserves bounded graph and matrix defaults", () => {
    const graph = fs.readFileSync(
      path.join(process.cwd(), "packages/dashboard/src/components/GraphView.tsx"),
      "utf8"
    );
    const matrix = fs.readFileSync(
      path.join(process.cwd(), "packages/dashboard/src/components/MatrixView.tsx"),
      "utf8"
    );
    expect(graph).toContain('graphKind === "file" ? 400 : 800');
    expect(matrix).toContain("const matrixLimit = 200");
  });
});
