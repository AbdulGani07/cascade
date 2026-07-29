import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultConfig } from "@cascade-code/config";
import { analyze } from "@cascade-code/core";

describe("Batch D integration", () => {
  it("resolves evidence-based component and document edges", () => {
    const result = analyze(path.resolve("tests/fixtures/batch-d"), {
      config: {
        ...defaultConfig,
        plugins: defaultConfig.plugins.map((plugin) =>
          plugin.id === "cascade-language-sql" ? { ...plugin, enabled: true } : plugin
        ),
      },
    });
    expect([...new Set(result.nodes.map((node) => node.language))]).toEqual(
      expect.arrayContaining(["vue", "svelte", "html", "styles", "graphql", "sql"])
    );
    for (const target of [
      "components/Card.vue",
      "styles/app.scss",
      "svelte/theme.css",
      "styles/base.css",
      "site/app.js",
      "graphql/fragments.graphql",
    ])
      expect(result.edges).toContainEqual(
        expect.objectContaining({ to: target, resolutionStatus: "resolved" })
      );
  });
});
