import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyze } from "@cascade-code/core";

const temporaryProjects: string[] = [];

function fixture(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "cascade-resolution-"));
  temporaryProjects.push(root);
  for (const [relative, content] of Object.entries(files)) {
    const target = path.join(root, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}

afterEach(() => {
  for (const root of temporaryProjects.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe("production module resolution", () => {
  it("resolves tsconfig paths, workspace exports, JSON, CSS, directories, and dynamic imports", () => {
    const root = fixture({
      "package.json": JSON.stringify({
        name: "fixture",
        workspaces: ["packages/*"],
      }),
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: { "@/*": ["src/*"] },
        },
      }),
      "src/index.ts": `
        import { util } from "@/utils";
        import { feature } from "@fixture/feature";
        import data from "./data.json";
        import "./style.css";
        import("./lazy");
        console.log(util, feature, data);
      `,
      "src/utils/index.ts": "export const util = 1;",
      "src/lazy.ts": "export default 1;",
      "src/data.json": "{}",
      "src/style.css": "body {}",
      "packages/feature/package.json": JSON.stringify({
        name: "@fixture/feature",
        exports: { ".": { types: "./src/index.ts", import: "./src/index.ts" } },
      }),
      "packages/feature/src/index.ts": "export const feature = 1;",
    });

    const result = analyze(root);
    const edges = result.edges.filter((edge) => edge.from === "src/index.ts");
    const targets = new Set(edges.map((edge) => edge.to));
    expect(targets.has("src/utils/index.ts")).toBe(true);
    expect(targets.has("packages/feature/src/index.ts")).toBe(true);
    expect(targets.has("src/data.json")).toBe(true);
    expect(targets.has("src/style.css")).toBe(true);
    expect(targets.has("src/lazy.ts")).toBe(true);
    expect(edges.every((edge) => edge.resolutionStatus === "resolved")).toBe(true);
    expect(result.projects?.some((project) => project.projectType === "monorepo")).toBe(true);
  });

  it("preserves unresolved diagnostics and does not classify workspace imports as external", () => {
    const root = fixture({
      "package.json": JSON.stringify({ name: "fixture", workspaces: ["packages/*"] }),
      "src/index.ts": `import "@fixture/missing"; import "./not-there";`,
      "packages/missing/package.json": JSON.stringify({ name: "@fixture/missing" }),
    });
    const result = analyze(root);
    const unresolved = result.edges.filter((edge) => edge.resolutionStatus === "unresolved");
    expect(unresolved).toHaveLength(2);
    expect(result.diagnostics?.filter((item) => item.code === "UNRESOLVED_IMPORT")).toHaveLength(2);
  });

  it("detects import casing mismatches when case-sensitive resolution is enabled", () => {
    const root = fixture({
      "src/index.ts": `import "./Utility";`,
      "src/utility.ts": "export const value = true;",
    });
    const result = analyze(root, {
      config: { ...defaultFixtureConfig(), caseSensitiveResolution: true },
    });
    expect(result.edges[0]?.resolutionStatus).toBe("ambiguous");
    expect(result.diagnostics?.some((item) => item.code === "IMPORT_CASE_MISMATCH")).toBe(true);
  });

  it("suppresses dead-code findings when no confident entry root exists", () => {
    const root = fixture({ "src/orphan.ts": "export const orphan = true;" });
    const result = analyze(root, { config: { ...defaultFixtureConfig(), entryPoints: [] } });
    expect(result.entryPoints).toHaveLength(0);
    expect(result.deadCodeFindings).toHaveLength(0);
  });
});

function defaultFixtureConfig() {
  return {
    entryPoints: ["src/index.ts"],
    ignore: ["**/node_modules/**", "**/.git/**"],
    extensions: [".ts", ".tsx", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"],
    plugins: [],
    assetExtensions: [".json", ".css"],
    includeNonCodeEdges: true,
    respectGitignore: true,
    pathAliases: {},
  };
}
