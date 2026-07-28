import { AnalysisResult, Reporter, ReporterOptions } from "@cascade/plugin-api";
import { safeReportResult } from "./security.js";

export class JsonReporter implements Reporter {
  id = "cascade-reporter-json";
  name = "JSON Reporter";
  format = "json" as const;

  render(result: AnalysisResult, _options?: ReporterOptions): string {
    return JSON.stringify(safeReportResult(result), null, 2);
  }
}
