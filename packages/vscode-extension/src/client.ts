import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { createRequire } from "node:module";
import readline from "node:readline";
import type {
  EditorRequestMethod,
  EditorResponse,
  ServiceLimits,
} from "@cascade-code/editor-service";

export interface ServiceClient {
  request<T>(
    method: EditorRequestMethod,
    params?: Record<string, unknown>,
    signal?: AbortSignal
  ): Promise<T>;
  dispose(): void;
}

interface Pending {
  resolve(value: unknown): void;
  reject(error: Error): void;
}

export class ProcessServiceClient implements ServiceClient {
  private readonly process: ChildProcessWithoutNullStreams;
  private readonly pending = new Map<string, Pending>();
  private sequence = 0;

  constructor(limits: Partial<ServiceLimits>, configuredServerPath?: string) {
    const launch = resolveServerLaunch(configuredServerPath);
    this.process = spawn(launch.command, launch.args, {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: { ...process.env, CASCADE_EDITOR_SERVICE: "1" },
    });
    const lines = readline.createInterface({ input: this.process.stdout, crlfDelay: Infinity });
    lines.on("line", (line) => this.handleLine(line));
    this.process.on("exit", (code) => {
      for (const pending of this.pending.values())
        pending.reject(
          new Error(`Cascade analysis service exited with code ${code ?? "unknown"}.`)
        );
      this.pending.clear();
    });
    this.process.on("error", (error) => {
      for (const pending of this.pending.values())
        pending.reject(
          new Error(
            `Cannot start the local Cascade editor service: ${error.message}. Install @cascade-code/editor-service or configure cascade.servicePath.`
          )
        );
      this.pending.clear();
    });
    void this.request("initialize", { limits });
  }

  request<T>(
    method: EditorRequestMethod,
    params: Record<string, unknown> = {},
    signal?: AbortSignal
  ): Promise<T> {
    const id = `vscode-${++this.sequence}`;
    return new Promise<T>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error("Operation cancelled."));
        return;
      }
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      const cancel = () => {
        this.process.stdin.write(
          `${JSON.stringify({ id: `${id}-cancel`, method: "cancel", params: { requestId: id } })}\n`
        );
        this.pending.delete(id);
        reject(new Error("Operation cancelled."));
      };
      signal?.addEventListener("abort", cancel, { once: true });
      this.process.stdin.write(`${JSON.stringify({ id, method, params })}\n`);
    });
  }

  dispose(): void {
    if (!this.process.killed) {
      this.process.stdin.write(
        `${JSON.stringify({ id: "shutdown", method: "shutdown", params: {} })}\n`
      );
      this.process.kill();
    }
  }

  private handleLine(line: string): void {
    let response: EditorResponse;
    try {
      response = JSON.parse(line) as EditorResponse;
    } catch {
      return;
    }
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);
    if (response.error) {
      const error = new Error(response.error.message);
      Object.assign(error, { code: response.error.code, retryable: response.error.retryable });
      pending.reject(error);
    } else pending.resolve(response.result);
  }
}

function resolveServerLaunch(configuredServerPath?: string): { command: string; args: string[] } {
  if (configuredServerPath?.trim()) {
    const target = configuredServerPath.trim();
    return target.endsWith(".js")
      ? { command: process.execPath, args: [target] }
      : { command: target, args: [] };
  }
  const require = createRequire(import.meta.url);
  try {
    return {
      command: process.execPath,
      args: [require.resolve("@cascade-code/editor-service/server")],
    };
  } catch {
    return { command: "cascade-editor-service", args: [] };
  }
}
