import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze, toJson } from "@cascade/core";
import { createMockLanguagePlugin } from "@cascade/test-utils";
import { defaultConfig } from "@cascade/config";

describe("project intelligence", () => {
  const root = path.resolve("tests/fixtures/polyglot-monorepo");

  it("builds deterministic typed project relationships for a polyglot monorepo", () => {
    const result = analyze(root);
    expect(result.projectGraph?.nodes.map((project) => project.id)).toEqual(
      expect.arrayContaining([".", "apps/web", "packages/shared", "services/worker"])
    );
    expect(result.projectGraph?.edges).toContainEqual(
      expect.objectContaining({
        from: "apps/web",
        to: "packages/shared",
        type: "runtime-depends-on",
      })
    );
    expect(result.projectGraph?.edges).toContainEqual(
      expect.objectContaining({ from: ".", to: "apps/web", type: "packages" })
    );
    expect(result.projectGraph?.edges).toContainEqual(
      expect.objectContaining({ from: ".", to: "services/worker", type: "references" })
    );
    expect(result.projectImpact?.["packages/shared"]?.allAffected).toContain("apps/web");
    const serialized = JSON.parse(toJson(result));
    expect(serialized.projectGraph.edges[0].sourceFiles[0]).not.toMatch(/^[A-Z]:\\/i);
  });

  it("accepts deterministic custom project detectors and selected-workspace analysis", () => {
    const custom = createMockLanguagePlugin({
      id: "custom-project-detector",
      projectDetectors: [
        {
          id: "custom-project",
          name: "Custom Project",
          detectProject(projectRoot) {
            return {
              id: "custom",
              name: "custom",
              rootPath: projectRoot,
              projectType: "custom",
              languages: [],
              workspaces: [],
              configFiles: [],
            };
          },
        },
      ],
    });
    const customResult = analyze(root, { customPlugins: [custom] });
    expect(customResult.projectGraph?.nodes).toContainEqual(
      expect.objectContaining({ id: "custom", projectType: "custom" })
    );
    const selectedResult = analyze(root, {
      customPlugins: [custom],
      config: { ...defaultConfig, selectedProjects: ["apps/web"] },
    });
    expect(selectedResult.nodes.every((node) => node.relativePath.startsWith("apps/web/"))).toBe(
      true
    );
  });
});
