import { AnalysisResult } from "./graph.js";

export interface ReporterOptions {
  verbose?: boolean;
  color?: boolean;
  outputFilePath?: string;
  options?: Record<string, unknown>;
}

export interface Reporter {
  id: string;
  name: string;
  format: "json" | "text" | "markdown" | "sarif" | "html";
  render(result: AnalysisResult, options?: ReporterOptions): string;
}

export interface IntegrationAdapter {
  id: string;
  name: string;
  exportIntegrationData(result: AnalysisResult): unknown;
}
