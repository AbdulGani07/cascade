import { parentPort } from "node:worker_threads";
import { analyze } from "@cascade/core";

if (!parentPort) throw new Error("Cascade analysis worker requires a parent port.");

parentPort.once("message", (root: unknown) => {
  if (typeof root !== "string") throw new Error("Analysis worker requires a workspace root.");
  try {
    parentPort!.postMessage({ result: analyze(root) });
  } catch (error) {
    parentPort!.postMessage({
      error: {
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
    });
  }
});
