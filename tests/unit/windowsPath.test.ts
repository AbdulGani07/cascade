import { describe, it, expect } from "vitest";
import { toJson } from "../../packages/core/src/export/jsonExporter.js";
import { AnalysisResult } from "../../packages/core/src/types/index.js";

describe("Windows Path Normalization in Export Schema", () => {
  it("converts all Windows backslash absolute paths to clean relative POSIX paths", () => {
    const fakeResult: AnalysisResult = {
      version: "1.0",
      generatedAt: "2026-07-27T19:00:00.000Z",
      projectRoot: "C:\\Users\\Developer\\CascadeProject",
      nodes: [
        {
          id: "C:\\Users\\Developer\\CascadeProject\\src\\index.ts",
          relativePath: "src/index.ts",
          isEntryPoint: true,
          language: "typescript",
        },
        {
          id: "C:\\Users\\Developer\\CascadeProject\\src\\utils.ts",
          relativePath: "src/utils.ts",
          isEntryPoint: false,
          language: "typescript",
        },
      ],
      edges: [
        {
          from: "C:\\Users\\Developer\\CascadeProject\\src\\index.ts",
          to: "C:\\Users\\Developer\\CascadeProject\\src\\utils.ts",
          kind: "static",
        },
      ],
      cycles: [],
      deadFiles: [],
      entryPoints: ["C:\\Users\\Developer\\CascadeProject\\src\\index.ts"],
      impact: {
        "C:\\Users\\Developer\\CascadeProject\\src\\utils.ts": {
          target: "C:\\Users\\Developer\\CascadeProject\\src\\utils.ts",
          directlyAffected: ["C:\\Users\\Developer\\CascadeProject\\src\\index.ts"],
          allAffected: ["C:\\Users\\Developer\\CascadeProject\\src\\index.ts"],
          isSafeToDelete: false,
        },
      },
      warnings: [],
    };

    const jsonStr = toJson(fakeResult);
    const parsed = JSON.parse(jsonStr);

    expect(parsed.nodes[0].id).toBe("src/index.ts");
    expect(parsed.edges[0].from).toBe("src/index.ts");
    expect(parsed.edges[0].to).toBe("src/utils.ts");
    expect(parsed.entryPoints[0]).toBe("src/index.ts");
    expect(parsed.impact["src/utils.ts"].target).toBe("src/utils.ts");
    expect(parsed.impact["src/utils.ts"].directlyAffected[0]).toBe("src/index.ts");
  });
});
