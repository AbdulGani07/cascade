# Dependency model

Cascade represents a repository as a directed graph. A node is a source file, project, package, service, or supported external dependency. An edge records evidence that one node depends on another.

## Edge direction

For an import such as:

```ts
import { formatUser } from "./format-user.js";
```

Cascade records an edge from the importing file to the resolved dependency:

```text
caller.ts -> format-user.ts
```

The reverse-adjacency index answers the inverse question: “what depends on this file?” Impact analysis starts from that index.

## Resolution states

An extracted dependency can be:

- **resolved** — mapped to a repository file or known project node;
- **external** — identified as a package or runtime dependency;
- **unresolved** — extracted, but not mapped with available evidence.

Unresolved dependencies remain visible because silently discarding them would overstate confidence.

## Evidence and confidence

Language plugins extract dependencies using syntax-aware parsing, structured project metadata, or documented fallback scanning. Capability differs by language; see the [capability matrix](CAPABILITY_MATRIX.md). Cascade does not execute analyzed source files to discover dependencies.

## Cycles and strongly connected components

Files in a dependency cycle form a strongly connected component (SCC). Cascade condenses SCCs when computing graph-level properties so cyclic graphs remain tractable. A reported cycle is structural evidence, not automatically a defect.

## Project and file graphs

The file graph preserves detailed import relationships. The project graph aggregates those edges across detected package, module, service, and workspace boundaries. Aggregation is useful for large repositories but can conceal file-level detail; use `cascade graph --json` when exact edges matter.

## Paths

Reports use project-relative paths by default. Canonical filesystem checks still use resolved paths internally to enforce the configured repository boundary and symlink policy.

## Limits

The model is static and evidence-based. Dynamic imports, reflection, runtime dependency injection, generated source, conditional build logic, and language-specific resolution rules may produce incomplete or unresolved edges.
