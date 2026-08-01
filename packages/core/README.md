# `@cascade-code/core`

Cascade's graph-analysis engine for building dependency graphs and deriving cycles, reachability, project intelligence, Git change impact, and architecture-governance findings.

## Should I install it directly?

Usually no. Normal users should install `@cascade-code/cli`; install core when embedding Cascade analysis in a Node.js application.

```bash
npm install @cascade-code/core@next
```

## Usage

```ts
import { analyze } from "@cascade-code/core";

const result = analyze(process.cwd());
console.log(result.nodes.length, result.edges.length, result.cycles);
```

Core exports the `analyze` orchestration API and graph/config types, JSON export helpers, plugin registry, path utilities, project detection, Git-impact analysis, governance evaluation, and cycle detection.

## Environment and privacy

Requires Node.js 22.13 or newer. Analysis is local, but callers control where returned source-derived paths and reports are stored or transmitted. Apply the documented file, byte, edge, depth, timeout, and plugin trust boundaries.

## Limitations

The graph represents statically observable source and metadata relationships. It does not execute builds, compilers, application code, dynamic loaders, or external services, and it is not a security scanner or type checker.

[Documentation](../../docs/README.md) · [Architecture](../../docs/ARCHITECTURE.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
