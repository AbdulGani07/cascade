# JavaScript and TypeScript Analysis Support

This document describes the JavaScript and TypeScript analyzer in Cascade 2.3.0. “Supported”
means covered by compiler-AST extraction or project-aware
resolution and regression tests. “Partial” identifies conservative static
analysis where runtime values can prevent a definitive answer.

## Syntax matrix

| Syntax or file type                          | Status                                | Classification                               |
| -------------------------------------------- | ------------------------------------- | -------------------------------------------- |
| `.js`, `.jsx`, `.mjs`, `.cjs`                | Supported                             | JavaScript                                   |
| `.ts`, `.tsx`, `.mts`, `.cts`                | Supported                             | TypeScript                                   |
| `.d.ts`, `.d.mts`, `.d.cts`                  | Supported                             | Generated/type-only source                   |
| ESM imports and side-effect imports          | Supported                             | Runtime/static                               |
| Named/default re-exports and `export *`      | Supported                             | Re-export                                    |
| Type-only imports and exports                | Supported                             | Type-only                                    |
| CommonJS `require()`                         | Supported                             | Runtime/static or conditional                |
| `require.resolve()`                          | Supported                             | Reference                                    |
| TypeScript import-equals                     | Supported                             | Runtime or type-only                         |
| Dynamic `import()`                           | Supported for literal specifiers      | Runtime/dynamic                              |
| Triple-slash path/type/lib references        | Supported                             | Type-only reference                          |
| JSON, CSS, and configured assets             | Supported                             | Non-code edge                                |
| `Worker` and `SharedWorker` constructors     | Supported for literal URLs            | Runtime/dynamic                              |
| `module.exports` / `exports.*`               | Parsed without false dependency edges | Export assignment                            |
| Computed template or concatenated specifiers | Partial                               | Diagnostic/unresolved when detectable        |
| Malformed source                             | Partial recovery                      | Parse diagnostic plus recovered dependencies |

## Resolution matrix

| Resolution source                                                  | Status                                                  |
| ------------------------------------------------------------------ | ------------------------------------------------------- |
| Relative and absolute paths                                        | Supported                                               |
| Extensionless files and directory indexes                          | Supported                                               |
| JS/TS ESM and CommonJS extensions                                  | Supported                                               |
| `package.json` `main`, `module`, `browser`, `types`, and `typings` | Supported                                               |
| Root and subpath `exports`, including configured conditions        | Supported                                               |
| `package.json#imports`                                             | Supported through TypeScript/Node resolution            |
| `tsconfig` `baseUrl` and `paths`                                   | Supported                                               |
| TypeScript project references                                      | Supported through compiler configuration and workspaces |
| npm, pnpm, and Yarn workspace package names                        | Supported from package manifests                        |
| Installed external packages and symlinks                           | Supported through TypeScript/Node resolution            |
| Vite/Webpack aliases                                               | Supported for statically declared string/path aliases   |
| Next.js/tsconfig aliases                                           | Supported                                               |
| `cascade.config.json` custom aliases                               | Supported                                               |
| Case-sensitive and case-insensitive hosts                          | Supported; mismatches are diagnosed                     |
| Runtime-generated aliases or custom resolver plugins               | Not inferred; use custom aliases/plugin                 |
| Yarn Plug'n'Play without a Node-compatible resolver hook           | Limited                                                 |

Unresolved internal imports remain in the edge list with
`resolutionStatus: "unresolved"` and an `UNRESOLVED_IMPORT` diagnostic. Bare
installed packages are classified as external. Known workspace package names
are never silently downgraded to external.

## Framework and project matrix

| Project type              | Detection and entry evidence                                             |
| ------------------------- | ------------------------------------------------------------------------ |
| Node.js application       | Package fields plus `src/index`, `src/main`, `src/app`, and `src/server` |
| TypeScript library        | Package type declarations, exports, and configured roots                 |
| React                     | Dependency metadata and application bootstrap conventions                |
| Vite                      | Dependency/config metadata and `src/main`                                |
| Next.js pages/app routers | Dependency metadata and route modules                                    |
| Express                   | Dependency metadata and server bootstrap                                 |
| NestJS                    | Dependency metadata and `src/main`                                       |
| npm/pnpm/Yarn workspace   | Nested package manifests and workspace package names                     |
| Turborepo                 | `turbo` dependency or `turbo.json`                                       |
| Nx                        | `nx` dependency or `nx.json`                                             |
| Generic monorepo          | Multiple package manifests/workspace declarations                        |
| Tests                     | Separate entry roots; excluded from production dead-code findings        |

## Accuracy safeguards

- Parsing uses the TypeScript compiler syntax tree for all JS/TS variants and
  retains recoverable imports from malformed files.
- Each file is parsed once per analysis and resolution results are cached for
  the duration of that analysis.
- Unresolved, ambiguous, external, runtime, and type-only edges remain distinct.
- Dead-code findings require entry evidence with at least 0.8 confidence.
- Dead-code confidence is reduced when parse or resolution diagnostics exist.
- Generated files, tests, configuration, and assets are excluded from dead-code
  findings.
- `.gitignore` and Cascade ignore patterns are respected by default.
- Directory traversal tracks real paths to prevent symlink cycles.
- Graph traversal uses precomputed adjacency and reverse-adjacency indexes.

## Known limitations

- Non-literal dynamic imports, `require()` calls, and worker URLs cannot be
  resolved statically.
- Arbitrary executable Vite/Webpack/Next configuration is not evaluated; only
  statically recognizable aliases are loaded.
- Conditional exports are evaluated using configured condition priority rather
  than simulating every possible runtime.
- Yarn Plug'n'Play installations require an environment resolver hook or custom
  plugin.
- Framework route conventions are intentionally conservative and do not execute
  framework compilers.
- Symbol-level dead export analysis is not yet provided; dead-code findings are
  file-level reachability findings.

## Performance

Run `pnpm build && pnpm benchmark`. The benchmark creates deterministic 100,
1,000, and 5,000-file projects and reports wall-clock time and heap delta.
Results from the release machine are recorded in the changelog.
