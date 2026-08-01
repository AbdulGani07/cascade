# `@cascade-code/plugin-api`

Defines the stable TypeScript contracts shared by Cascade language plugins, graph results, reporters, project intelligence, Git impact, and architecture governance.

## Should I install it directly?

Only plugin, reporter, or integration authors normally install it; CLI users do not need it directly.

```bash
npm install @cascade-code/plugin-api@next
```

## Minimal plugin skeleton

This skeleton uses only exported `LanguagePlugin` contract fields:

```ts
import type { LanguagePlugin } from "@cascade-code/plugin-api";

export const plugin: LanguagePlugin = {
  id: "example-language-text",
  name: "Example text plugin",
  version: "1.0.0",
  supportedExtensions: [".txt"],
  fileDetectionRules: [{ type: "extension", pattern: ".txt" }],
  analysisLevels: ["file-dependency"],
  capabilities: {
    astParsing: false,
    symbolExtraction: false,
    dynamicDependencies: false,
    reExports: false,
    typeOnlyDependencies: false,
    moduleResolution: false,
    entryPointDetection: false,
    testFileDetection: false,
    generatedFileDetection: false,
    crossLanguageEdges: false,
  },
  limitations: {
    knownIssues: ["Only literal file references are recognized."],
    unsupportedFeatures: ["Runtime-generated paths"],
  },
  parser: {
    parse: () => ({ status: "success", diagnostics: [] }),
  },
  dependencyExtractor: {
    extractDependencies: () => ({ dependencies: [], diagnostics: [] }),
  },
  moduleResolver: {
    resolveModule: () => ({
      resolutionStatus: "unresolved",
      confidence: 0,
      resolverId: "example-text-resolver",
    }),
  },
};
```

Exports include graph and diagnostic models, the `LanguagePlugin` adapters and capability declarations, project/reporter contracts, Git-impact models, and governance rules and suppressions.

## Environment, security, and limitations

Requires Node.js 22.13 or newer. Plugins run in the host process with its filesystem and process privileges; this API is not a sandbox. Contract conformance does not establish parser accuracy or plugin trustworthiness.

[Documentation](../../docs/README.md) · [Plugin development](../../docs/PLUGIN_DEVELOPMENT.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
