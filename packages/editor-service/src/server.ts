#!/usr/bin/env node
import readline from "node:readline";
import { Worker } from "node:worker_threads";
import type { AnalysisResult } from "@cascade-code/plugin-api";
import {
  EDITOR_PROTOCOL_VERSION,
  type EditorRequest,
  type EditorResponse,
  type FileUpdate,
  type QueryOptions,
  type ServiceLimits,
  type WorkspaceDescriptor,
} from "./protocol.js";
import {
  CancellationTokenSource,
  ServiceError,
  WorkspaceAnalysisService,
  type Analyzer,
} from "./service.js";

const workerAnalyzer: Analyzer = (root, token) =>
  new Promise<AnalysisResult>((resolve, reject) => {
    const worker = new Worker(new URL("./analysisWorker.js", import.meta.url));
    const cancellationPoll = setInterval(() => {
      if (token?.isCancellationRequested) {
        clearInterval(cancellationPoll);
        void worker.terminate();
        reject(new ServiceError("CANCELLED", "Analysis cancelled.", true));
      }
    }, 20);
    cancellationPoll.unref?.();
    worker.once("message", (message: { result?: AnalysisResult; error?: { message: string } }) => {
      clearInterval(cancellationPoll);
      void worker.terminate();
      if (message.error) reject(new Error(message.error.message));
      else if (message.result) resolve(message.result);
      else reject(new Error("Analysis worker returned an invalid response."));
    });
    worker.once("error", (error) => {
      clearInterval(cancellationPoll);
      reject(error);
    });
    worker.postMessage(root);
  });

let service = new WorkspaceAnalysisService({}, workerAnalyzer);
const cancellations = new Map<string, CancellationTokenSource>();
const input = readline.createInterface({ input: process.stdin, crlfDelay: Infinity });

function write(response: EditorResponse): void {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

async function dispatch(request: EditorRequest): Promise<unknown> {
  const params = request.params ?? {};
  switch (request.method) {
    case "initialize":
      service.dispose();
      service = new WorkspaceAnalysisService(
        (params.limits ?? {}) as Partial<ServiceLimits>,
        workerAnalyzer
      );
      return {
        protocolVersion: EDITOR_PROTOCOL_VERSION,
        capabilities: {
          incrementalSavedFiles: true,
          multiRoot: true,
          cancellation: true,
          diagnostics: ["cycle", "architecture", "unresolved", "parse"],
          queries: [
            "dependencies",
            "dependents",
            "impact",
            "entryPoint",
            "affectedTests",
            "explanationPath",
          ],
          sourceTransport: "none",
        },
      };
    case "workspace/add":
      return service.addWorkspace(params.workspace as WorkspaceDescriptor);
    case "workspace/remove":
      return service.removeWorkspace(String(params.workspaceId));
    case "workspace/refresh": {
      const cancellation = new CancellationTokenSource();
      cancellations.set(request.id, cancellation);
      try {
        return await service.refresh(String(params.workspaceId), cancellation.token);
      } finally {
        cancellations.delete(request.id);
      }
    }
    case "workspace/updateFile":
      return service.updateFile(params.update as unknown as FileUpdate);
    case "query/dependencies":
      return service.dependencies(
        String(params.workspaceId),
        String(params.file),
        (params.options ?? {}) as QueryOptions
      );
    case "query/dependents":
      return service.dependents(
        String(params.workspaceId),
        String(params.file),
        (params.options ?? {}) as QueryOptions
      );
    case "query/impact":
      return service.impact(String(params.workspaceId), String(params.file));
    case "query/diagnostics":
      return service.diagnostics(
        String(params.workspaceId),
        params.file === undefined ? undefined : String(params.file)
      );
    case "query/entryPoint":
      return service.entryPoint(String(params.workspaceId), String(params.file));
    case "query/affectedTests":
      return service.affectedTests(String(params.workspaceId), String(params.file));
    case "query/explanationPath":
      return service.explanationPath(
        String(params.workspaceId),
        String(params.from),
        String(params.to),
        params.direction === "dependent" ? "dependent" : "dependency",
        (params.options ?? {}) as QueryOptions
      );
    case "health":
      return service.listHealth();
    case "cancel": {
      const pending = cancellations.get(String(params.requestId));
      pending?.cancel();
      return { cancelled: Boolean(pending) };
    }
    case "shutdown":
      service.dispose();
      input.close();
      return { shutdown: true };
    default:
      throw new ServiceError("METHOD_NOT_FOUND", `Unsupported method '${request.method}'.`);
  }
}

input.on("line", (line) => {
  if (Buffer.byteLength(line, "utf8") > 1_000_000) {
    write({
      id: "",
      error: {
        code: "REQUEST_TOO_LARGE",
        message: "Editor service requests are limited to 1 MB.",
        retryable: false,
      },
    });
    return;
  }
  let request: EditorRequest;
  try {
    request = JSON.parse(line) as EditorRequest;
    if (!request.id || !request.method) throw new Error("Request requires id and method.");
  } catch (error) {
    write({
      id: "",
      error: { code: "INVALID_REQUEST", message: (error as Error).message, retryable: false },
    });
    return;
  }
  void dispatch(request)
    .then((result) => write({ id: request.id, result }))
    .catch((error: Error | ServiceError) =>
      write({
        id: request.id,
        error: {
          code: error instanceof ServiceError ? error.code : "INTERNAL_ERROR",
          message: error.message,
          retryable: error instanceof ServiceError ? error.retryable : false,
        },
      })
    );
});

process.on("SIGINT", () => {
  service.dispose();
  process.exitCode = 0;
  input.close();
});
