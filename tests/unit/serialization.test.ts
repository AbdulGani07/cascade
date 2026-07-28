import { describe, it, expect } from "vitest";
import { toJson, migrateResultToLatest } from "@cascade/core";
import { AnalysisResult } from "@cascade/plugin-api";

describe("Serialization & Schema Versioning", () => {
  it("serializes AnalysisResult to valid JSON with version 2.0 schema", () => {
    const mockResult: AnalysisResult = {
      version: "2.0",
      generatedAt: "2026-07-28T00:00:00.000Z",
      projectRoot: "/app",
      nodes: [
        {
          id: "src/index.ts",
          absolutePath: "/app/src/index.ts",
          relativePath: "src/index.ts",
          language: "typescript",
          fileCategory: "source",
          isEntryPoint: true,
          isTestFile: false,
          isGeneratedFile: false,
          parseStatus: "success",
          pluginProvenance: { pluginId: "cascade-language-typescript", pluginVersion: "1.0.0" },
        },
      ],
      edges: [
        {
          id: "src/index.ts -> src/utils.ts [static]",
          from: "src/index.ts",
          to: "src/utils.ts",
          edgeType: "import",
          importKind: "static",
          isStatic: true,
          isDynamic: false,
          isTypeOnly: false,
          isReExport: false,
          isConditional: false,
          resolutionStatus: "resolved",
          resolverProvenance: {
            resolverId: "ts-resolver",
            pluginId: "cascade-language-typescript",
          },
          confidence: 1.0,
        },
      ],
      cycles: [],
      deadFiles: [],
      entryPoints: ["src/index.ts"],
      impact: {
        "src/index.ts": {
          target: "src/index.ts",
          directlyAffected: [],
          allAffected: [],
          isSafeToDelete: true,
        },
      },
      warnings: [],
    };

    const jsonStr = toJson(mockResult);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.version).toBe("2.0");
    expect(parsed.nodes[0].id).toBe("src/index.ts");
    expect(parsed.edges[0].from).toBe("src/index.ts");
  });

  it("migrates legacy version 1.0 result object to version 2.0 schema", () => {
    const legacyRaw = {
      version: "1.0",
      projectRoot: "/app",
      nodes: [
        {
          id: "/app/src/main.js",
          relativePath: "src/main.js",
          isEntryPoint: true,
          language: "javascript",
        },
      ],
      edges: [{ from: "/app/src/main.js", to: "/app/src/helper.js", kind: "static" }],
      cycles: [],
      deadFiles: [],
      entryPoints: ["/app/src/main.js"],
      impact: {},
      warnings: [],
    };

    const migrated = migrateResultToLatest(legacyRaw);
    expect(migrated.version).toBe("2.0");
    expect(migrated.nodes[0].id).toBe("src/main.js");
    expect(migrated.edges[0].from).toBe("src/main.js");
    expect(migrated.edges[0].to).toBe("src/helper.js");
    expect(migrated.edges[0].importKind).toBe("static");
  });
});
