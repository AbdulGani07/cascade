import path from "node:path";
import { performance } from "node:perf_hooks";
import { WorkspaceAnalysisService } from "../packages/editor-service/dist/index.js";

const count = Math.max(100, Number(process.argv[2] ?? 50_000));
const root = path.resolve("benchmarks/synthetic-editor-workspace");
const nodes = Array.from({ length: count }, (_, index) => ({
  id: `src/file-${index}.ts`,
  absolutePath: path.join(root, `src/file-${index}.ts`),
  relativePath: `src/file-${index}.ts`,
  language: "typescript",
  fileCategory: index % 20 === 0 ? "test" : "source",
  project: `package-${Math.floor(index / 1000)}`,
  isEntryPoint: index === count - 1,
  isTestFile: index % 20 === 0,
  isGeneratedFile: false,
  parseStatus: "success",
  pluginProvenance: { pluginId: "benchmark", pluginVersion: "1" },
}));
const edges = [];
for (let index = 1; index < count; index += 1) {
  for (const distance of [1, 7]) {
    const target = Math.max(0, index - distance);
    edges.push({
      id: `${index}->${target}`,
      from: `src/file-${index}.ts`,
      to: `src/file-${target}.ts`,
      edgeType: "import",
      importKind: "static",
      isStatic: true,
      isDynamic: false,
      isTypeOnly: false,
      isReExport: false,
      isConditional: false,
      resolutionStatus: "resolved",
      resolverProvenance: { resolverId: "benchmark", pluginId: "benchmark" },
      confidence: 1,
    });
  }
}
const result = {
  version: "2.0",
  generatedAt: "2026-01-01T00:00:00.000Z",
  projectRoot: root,
  nodes,
  edges,
  cycles: [],
  deadFiles: [],
  entryPoints: [`src/file-${count - 1}.ts`],
  impact: {
    "src/file-0.ts": {
      target: "src/file-0.ts",
      directlyAffected: ["src/file-1.ts", "src/file-7.ts"],
      allAffected: nodes.slice(1).map((node) => node.id),
      isSafeToDelete: false,
    },
  },
  warnings: [],
};
const service = new WorkspaceAnalysisService(
  { maxFiles: count + 1, maxEdges: edges.length + 1, maxTraversalDepth: 30 },
  () => result
);
service.addWorkspace({ id: "benchmark", root });
const started = performance.now();
await service.refresh("benchmark");
const refreshed = performance.now();
service.dependencies("benchmark", `src/file-${count - 1}.ts`);
service.dependents("benchmark", "src/file-0.ts");
service.impact("benchmark", "src/file-0.ts");
service.diagnostics("benchmark", "src/file-0.ts");
service.affectedTests("benchmark", "src/file-0.ts");
service.explanationPath("benchmark", `src/file-${count - 1}.ts`, `src/file-${count - 30}.ts`);
const queried = performance.now();
console.log(
  JSON.stringify(
    {
      files: nodes.length,
      edges: edges.length,
      refreshMs: Number((refreshed - started).toFixed(2)),
      querySuiteMs: Number((queried - refreshed).toFixed(2)),
      heapMiB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
    },
    null,
    2
  )
);
