export * from "@cascade-code/plugin-api";
import { CascadeConfig } from "@cascade-code/config";

export type ResolvedConfig = CascadeConfig;
export type { CascadeConfig };

/** Custom error class for handling domain-specific errors in Cascade. */
export class CascadeError extends Error {
  constructor(
    public code: "PARSE_ERROR" | "CONFIG_ERROR" | "FILE_NOT_FOUND",
    message: string,
    public filePath?: string
  ) {
    super(message);
    this.name = "CascadeError";
  }
}
