import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyze } from "@cascade/core";

const root = path.resolve("tests/fixtures/batch-b");

describe("Batch B integration", () => {
  it("analyzes PHP, Ruby, Swift, and Dart without inventing unresolved targets", () => {
    const result = analyze(root);
    const languages = new Set(result.nodes.map((node) => node.language));
    expect([...languages]).toEqual(expect.arrayContaining(["php", "ruby", "swift", "dart"]));
    expect(result.edges).toContainEqual(
      expect.objectContaining({
        extractedText: "./service.php",
        resolutionStatus: "resolved",
      })
    );
    expect(result.edges).toContainEqual(
      expect.objectContaining({
        extractedText: "./service.dart",
        resolutionStatus: "resolved",
      })
    );
    expect(
      result.pluginManifests.find((plugin) => plugin.id === "cascade-language-php")
    ).toMatchObject({ analysisLevels: expect.arrayContaining(["build-dependency"]) });
    expect(result.projects).toContainEqual(
      expect.objectContaining({ projectType: "php-composer", buildSystem: "composer" })
    );
  });
});
