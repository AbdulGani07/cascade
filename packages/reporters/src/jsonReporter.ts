import { AnalysisResult, Reporter, ReporterOptions } from "@cascade/plugin-api";

export class JsonReporter implements Reporter {
  id = "cascade-reporter-json";
  name = "JSON Reporter";
  format = "json" as const;

  render(result: AnalysisResult, _options?: ReporterOptions): string {
    return JSON.stringify(result, null, 2);
  }
}
