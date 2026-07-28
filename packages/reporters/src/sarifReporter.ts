import { AnalysisResult, Reporter, ReporterOptions } from "@cascade/plugin-api";

export class SarifReporter implements Reporter {
  id = "cascade-reporter-sarif";
  name = "SARIF Diagnostic Reporter";
  format = "sarif" as const;

  render(result: AnalysisResult, _options?: ReporterOptions): string {
    const rules = [
      {
        id: "CASCADE001",
        name: "CircularDependency",
        shortDescription: { text: "Circular dependency detected between modules" },
      },
      {
        id: "CASCADE002",
        name: "UnreachableCode",
        shortDescription: { text: "File is unreachable from configured entry points" },
      },
    ];

    const runsResults: Array<Record<string, unknown>> = [];

    for (const cycle of result.cycles) {
      runsResults.push({
        ruleId: "CASCADE001",
        level: "warning",
        message: { text: `Circular dependency detected: ${cycle.join(" -> ")}` },
        locations: cycle.map((f: string) => ({
          physicalLocation: {
            artifactLocation: { uri: f },
          },
        })),
      });
    }

    for (const deadFile of result.deadFiles) {
      runsResults.push({
        ruleId: "CASCADE002",
        level: "note",
        message: { text: `Unreachable file detected: ${deadFile}` },
        locations: [
          {
            physicalLocation: {
              artifactLocation: { uri: deadFile },
            },
          },
        ],
      });
    }

    const sarifPayload = {
      $schema:
        "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: {
            driver: {
              name: "Cascade",
              version: "2.1.0",
              rules,
            },
          },
          results: runsResults,
        },
      ],
    };

    return JSON.stringify(sarifPayload, null, 2);
  }
}
