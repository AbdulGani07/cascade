# Plugin development

Language plugins connect file detection, parsing, dependency extraction, resolution, and optional symbol or project intelligence to Cascade.

## Contract

Implement `LanguagePlugin` from `@cascade-code/plugin-api`:

```ts
import type { LanguagePlugin } from "@cascade-code/plugin-api";

export const plugin: LanguagePlugin = {
  id: "cascade-language-example",
  name: "Example language",
  version: "1.0.0",
  supportedExtensions: [".example"],
  fileDetectionRules: [{ type: "extension", pattern: ".example" }],
  capabilities: {
    astParsing: false,
    symbolExtraction: false,
    dynamicDependencies: false,
    reExports: false,
    typeOnlyDependencies: false,
    moduleResolution: true,
    entryPointDetection: false,
    testFileDetection: false,
    generatedFileDetection: false,
    crossLanguageEdges: false,
  },
  limitations: {
    knownIssues: [],
    unsupportedFeatures: ["runtime-computed imports"],
  },
  analysisLevels: ["file-dependency"],
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
      resolverId: "example",
    }),
  },
};
```

The complete interfaces are in `packages/plugin-api/src/types/plugin.ts`.

## Lifecycle

1. Cascade matches a file using the plugin’s detection rules.
2. The parser returns success, partial, or failed status plus diagnostics.
3. The extractor emits dependency evidence.
4. The resolver classifies each dependency as resolved, unresolved, external, or ambiguous.
5. Optional adapters add symbols, entry points, tests, generated-file detection, framework metadata, or graph diagnostics.

See the [plugin lifecycle diagram](ARCHITECTURE.md#plugin-lifecycle).

## Trust boundary

Plugins run in the Cascade process and therefore inherit its filesystem and process privileges. Install only reviewed plugins from trusted publishers. A plugin is code, not configuration data.

Plugins must not execute analyzed repository source. Avoid loading repository build configuration as JavaScript; parse structured files as data. Any unavoidable execution must be separately opt-in, isolated, time-bounded, and documented.

## Quality requirements

- Declare capabilities and limitations accurately.
- Normalize output to project-relative paths.
- Bound parsing, recursion, concurrency, and input sizes.
- Honor cancellation and timeout signals exposed by the host.
- Return explicit diagnostics for partial and failed parsing.
- Test malicious filenames, malformed syntax, large inputs, symlinks, and unresolved imports.
- Keep results deterministic for identical inputs.

Use existing language packages as implementation examples and run `pnpm run check` before contributing.
