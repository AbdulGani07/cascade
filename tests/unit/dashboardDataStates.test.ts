import { describe, expect, it } from "vitest";
import {
  getAnalysisState,
  validateAnalysis,
  type AnalysisResult,
} from "../../packages/dashboard/src/lib/api";

const report = (overrides: Partial<AnalysisResult> = {}): AnalysisResult => ({
  version: "2.0",
  generatedAt: "2026-01-01T00:00:00.000Z",
  projectRoot: ".",
  nodes: [{ id: "src/index.ts", language: "typescript", isEntryPoint: true }],
  edges: [],
  cycles: [],
  deadFiles: [],
  entryPoints: ["src/index.ts"],
  impact: {},
  warnings: [],
  ...overrides,
});

describe("dashboard report states", () => {
  it("accepts supported complete and empty reports", () => {
    expect(getAnalysisState(validateAnalysis(report()))).toBe("complete");
    expect(getAnalysisState(validateAnalysis(report({ nodes: [] })))).toBe("empty");
  });

  it("marks warnings, diagnostics, and failed parses as partial", () => {
    expect(getAnalysisState(report({ warnings: [{ file: "x", message: "partial" }] }))).toBe(
      "partial"
    );
    expect(
      getAnalysisState(
        report({ nodes: [{ id: "x", language: "go", isEntryPoint: false, parseStatus: "failed" }] })
      )
    ).toBe("partial");
  });

  it("rejects malformed reports and unsupported schemas with actionable errors", () => {
    expect(() => validateAnalysis({ version: "2.0", nodes: [] })).toThrow(/edges must be an array/);
    expect(() => validateAnalysis({ ...report(), version: "3.0" })).toThrow(
      /Unsupported analysis schema version: 3.0/
    );
  });

  it("redacts absolute Windows and Unix paths before rendering", () => {
    const safe = validateAnalysis(
      report({
        warnings: [
          { file: "C:\\Users\\person\\secret\\app.ts", message: "at /opt/person/private/app.ts" },
        ],
      })
    );
    expect(JSON.stringify(safe)).not.toMatch(/Users|person|\\secret|\/opt\//);
    expect(JSON.stringify(safe)).toContain("[local-path]");
  });

  it("retains edge provenance needed for explanations", () => {
    const safe = validateAnalysis(
      report({
        edges: [
          {
            from: "src/a.ts",
            to: "src/b.ts",
            edgeType: "import",
            resolutionStatus: "unresolved",
            resolverProvenance: { resolverId: "ts-resolver", pluginId: "typescript" },
            confidence: 0.5,
            evidence: ["specifier did not resolve"],
          },
        ],
      })
    );
    expect(safe.edges[0].resolverProvenance?.resolverId).toBe("ts-resolver");
  });
});
