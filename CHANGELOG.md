# Changelog

All notable changes to Cascade will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

## [3.3.0] - 2026-07-28

### Added

- Reusable `@cascade-code/editor-service` with a versioned local protocol, multi-root snapshots,
  debounced saved-file refreshes, cancellation workers, bounded caching, diagnostics, impact
  queries, affected-test candidates, explanation paths, and repository-size safeguards.
- Official VS Code extension source package with CodeLens, dependency navigation, diagnostics,
  affected tests, local dashboard launch, opt-in background analysis, and analysis-health status.
- Editor integration architecture, privacy, performance, configuration, troubleshooting, and
  publishing documentation plus deterministic service and extension tests.
- Deterministic performance fixtures for 100, 1,000, 10,000, and opt-in 50,000-file
  repositories, deep chains, dense graphs, large cycles, unresolved dependencies, serialization,
  dashboard preparation, memory, warm runs, and one-file updates.
- Security threat model and adversarial tests covering traversal, symlinks, malicious
  configuration, resource exhaustion, report injection, secret leakage, and dashboard exposure.
- CI dependency auditing, dependency review, secret scanning, CodeQL, and a stable graph
  performance regression threshold.

### Changed

- File discovery no longer reads every source file solely to count lines; parser selection uses a
  priority-preserving extension index.
- Cycle analysis now uses iterative strongly connected components, avoiding exponential cycle
  enumeration and recursion limits on dense or deep graphs.
- Analysis accepts cancellation, timeouts, phase timing, and a structural mode that avoids
  materializing quadratic all-file impact payloads.
- Configuration is strict JSON with validated resource limits and explicit symlink policy.
- All package and first-party plugin versions now report `3.3.0`.

### Security

- Symlinks are ignored by default and optional symlink traversal is restricted to canonical
  targets within the analyzed root.
- File count, individual file size, and total included-byte limits are enforced before parsing;
  containment and size are rechecked before source reads.
- JSON, Markdown, and SARIF reports use project-relative paths, neutralize injection-prone
  filenames, and redact common credential forms.
- The local dashboard is loopback-only with a random HttpOnly session token, CSP, no-store
  responses, frame denial, MIME protection, and bounded HTTP timeouts.
- Git revisions reject option-like or control-character input; Action paths and editor workspaces
  are canonicalized within their permitted roots.
- GitHub workflows use explicit minimum permissions and do not upload fork-PR SARIF.

### Performance

- On the documented Windows/Node 22 development machine, the legacy linear benchmark improved
  from 650.2 ms to 309.1 ms at 100 files, 4,019.3 ms to 2,400.9 ms at 1,000 files, and
  23,106.9 ms to 12,027.0 ms at 5,000 files.
- Dense 250-node/4,000-edge graph analysis fell from 5,149 ms to 1.7 ms after SCC condensation.
- The opt-in 50,000-file structural run completed in 127.7 seconds with approximately 566 MiB RSS
  growth; these measurements are expectations for regression analysis, not guarantees.

## [3.2.0] - 2026-07-28

### Added

- Official composite GitHub Action with safe pull-request ref resolution, configurable policy gates, dependency caching, job summaries, and JSON, Markdown, HTML, and SARIF artifacts.
- Example pull-request and tagged-release workflows, minimum-permission and fork-safety guidance, and CLI examples for GitLab CI, Jenkins, Azure Pipelines, CircleCI, and Bitbucket Pipelines.
- CLI setup and platform commands: `init`, `config validate`, `doctor`, `cache`, and shell completion, plus command suggestions, grouped help, debug/color controls, and documented exit codes.
- Professional dashboard workspace views for repositories, projects, files, packages, services, cycles, unreachable code, change impact, pull requests, affected tests, architecture violations, unresolved dependencies, languages, hotspots, dependency matrices, and snapshots.
- Dashboard command palette, URL-persisted views and filters, light/dark modes, direct and transitive path tracing, edge evidence, architecture-boundary and graph-diff overlays, and JSON/HTML/SVG/PNG/PDF export paths.
- Dashboard component, accessibility-contract, schema, interaction, graph-algorithm, and 50,000-node performance tests.

### Changed

- Dashboard graph rendering now starts from meaningful bounded groups instead of laying out every file: 400 file nodes, 800 project/package/service nodes, and 200 matrix nodes by default.
- Cascade configuration can be selected through a validated action path, with selected-project overrides propagated consistently.
- CLI package metadata now declares its binary, entry point, types, exports, and deterministic published file set.

### Security

- GitHub Action inputs use environment transfer and Node argument arrays instead of interpolated shell commands; repository-relative paths are validated before use.
- The dashboard renders repository data as React text, avoids unsafe HTML injection, never executes analyzed source, and documents separate local and hosted deployment requirements.

### Performance

- Selecting 400 visible nodes from a synthetic 50,000-node/100,000-edge graph measured 114.27 ms and 16.27 MiB heap locally; 100,000 nodes/200,000 edges measured 230.76 ms and 27.87 MiB.

## [3.1.1] - 2026-07-28

### Added

- Project roles, file-to-project and project-to-file navigation indexes, deterministic language/role/build/workspace groups, and a dashboard Projects graph view.
- Nested Python project detection (including Poetry, uv, PDM, and Hatch), infrastructure project discovery, and expanded realistic polyglot fixtures.
- Typed project relationships for Maven, Gradle, MSBuild, Go workspaces, Cargo, CMake, Meson, container build contexts, and CI working directories.
- 1,000-workspace benchmark coverage and documented performance evidence.

### Changed

- Project selection and ignore overrides now filter project edges, project impact, and source nodes consistently; unmatched overrides produce diagnostics.
- Relationship and reverse-impact indexing now avoid quadratic/cubic lookup paths in large workspaces.

### Fixed

- Terraform relationships are owned by their infrastructure project instead of being attributed to the repository root.

## [3.1.0] - 2026-07-28

Released at `2026-07-28T15:09:31+06:00`.

### Added

- Language-neutral project and workspace intelligence with deterministic project ownership for polyglot repositories.
- Typed, evidence-bearing project relationships, package-cycle detection, project impact analysis, custom plugin project detectors, workspace selection, and overrides.
- Project graph JSON output, `cascade projects`, `cascade graph --project`, dashboard project-relationship summary, polyglot fixtures, and a large workspace benchmark.
- Project/build-system matrices, relationship model, configuration examples, limitations, and performance evidence.

## [3.0.0] - 2026-07-28

Released at `2026-07-28T14:40:01+06:00`.

### Added

- Batch B first-party plugins for PHP, Ruby, Swift, and Dart with package/build metadata and conservative resolution.
- Batch C first-party plugins for shell scripts, PowerShell, Lua, and R, including quoted special-character PowerShell paths.
- Batch D first-party plugins for Vue, Svelte, HTML, CSS/SCSS/Sass/Less, GraphQL, and opt-in SQL nodes.
- Error-tolerant structured token trees with locations and malformed string/comment diagnostics.
- Composer, Bundler/Rake, SwiftPM, Dart/Flutter, Nuxt/Vite, and Svelte/SvelteKit manifest evidence where statically available.
- Realistic fixtures, integration regressions, capability matrices, limitations, configuration examples, and parser benchmarks for all new plugins.

### Changed

- CLI, configuration, JSON plugin manifests, and dashboard capability metadata now include all Batch B–D plugins.
- Generated, vendor, dependency, cache, build, Pods, DerivedData, `.dart_tool`, `.bundle`, and R environment directories are excluded by default.
- SQL analysis is disabled by default and never invents repository file targets from table names.
- Repository version advanced to 3.0.0 because the first-party language surface and configuration schema expanded materially.

## [2.3.0] - 2026-07-28

Released at `2026-07-28T14:01:04+06:00`.

### Added

- First-party structured Tree-sitter plugins for Rust, C, and C++.
- Cargo package and workspace awareness, Rust module/crate/include resolution, and Cargo entry-point detection.
- CMake, Make, Meson, and Bazel project metadata with evidence-based C/C++ include resolution.
- Explicit plugin analysis-level declarations and published limitations in API manifests, JSON results, CLI summaries, and dashboard capability badges.
- Realistic Cargo workspace and native-build fixtures covering malformed sources, unresolved dependencies, generated files, and portable paths.
- Rust, C, and C++ regression tests and parser benchmarks.

### Changed

- Rust, C, C++, Cargo, and native build outputs are included in default discovery and exclusion rules.
- Project detection now recognizes Cargo, CMake, Make, Meson, and Bazel manifests.
- Plugin summaries expose analysis levels and limitations without claiming unsupported semantic or linker analysis.

## [2.2.0] - 2026-07-28

Released at `2026-07-28T13:28:17+06:00`.

### Added

- First-party structured Tree-sitter plugins for Java, Kotlin, C#, and Go.
- Maven, Gradle, Android, Kotlin Multiplatform, `.csproj`, `.sln`, Go module, and Go workspace metadata awareness.
- Language-specific package/module resolution, entry-point detection, test/generated-source detection, parse diagnostics, resolution diagnostics, confidence, and evidence.
- Project/build-system grouping, language capability badges, confidence labels, and mixed-language indicators in the dashboard.
- Realistic JVM, Android, .NET, ASP.NET Core, Go module/workspace, and mixed-language fixtures with regression coverage.
- Language-specific parser benchmarks in addition to graph-scale benchmarks.

### Changed

- Source nodes are assigned to the most specific detected build project.
- Build outputs and generated JVM/.NET directories are ignored by default.
- Cross-language edges remain restricted to resolvers that identify an actual target file; unresolved build relationships remain diagnostics.

## [2.1.0] - 2026-07-28

Released at `2026-07-28T10:51:41+06:00`.

### Added

- First-party `@cascade-code/language-python` plugin for `.py` and `.pyi`, including absolute, relative, conditional, local, `TYPE_CHECKING`, literal `importlib.import_module`, and literal `__import__` dependencies.
- Python module resolution for packages, namespace packages, `src` layouts, internal modules, standard-library modules, declared third-party packages, ambiguous modules, and unresolved imports.
- Python entry-point and project detection for `__main__.py`, main guards, Django, Flask, FastAPI, ASGI/WSGI, and common packaging metadata.
- Python dependency categories, confidence, evidence, parser diagnostics, CLI language/unresolved summaries, and dashboard language filtering.
- Python unit and integration regression coverage.

### Changed

- Virtual environments, Python caches, and generated environments are excluded by default.
- Dead-code findings are suppressed when non-literal Python dynamic loading makes reachability unsafe.
- Non-Node language plugins now use their own resolver without changing JavaScript or TypeScript resolution.

## [2.0.0] - 2026-07-28

Released at `2026-07-28T09:54:18+06:00`.

### Added

- Compiler-AST dependency extraction for ESM, CommonJS, type-only imports/exports, import-equals, dynamic imports, triple-slash references, worker URLs, and non-code imports.
- Project-aware resolution for tsconfig aliases, workspace packages, package exports/imports, conditional entry fields, directory indexes, custom aliases, and case-sensitive filesystems.
- Framework/project detection for React, Vite, Next.js, Express, NestJS, Turborepo, Nx, and generic workspaces.
- Entry-point confidence/evidence and confidence-bearing dead-code findings.
- Small, medium, and large generated benchmark fixtures plus syntax, resolution, and framework regression tests.

- **Pluggable Language Architecture (`@cascade-code/plugin-api`)**: Introduced standardized `LanguagePlugin`, `Parser`, `DependencyExtractor`, `SymbolExtractor`, `ModuleResolver`, and `Reporter` SPI interfaces.
- **Shared Configuration (`@cascade-code/config`)**: Added validated configuration models used consistently by the CLI, core engine, and plugins.
- **First-Party Language Plugins**:
  - `@cascade-code/language-javascript`: Plugin for JavaScript/JSX file parsing and module resolution.
  - `@cascade-code/language-typescript`: Plugin for TypeScript/TSX file parsing, type-only import detection, and symbol extraction.
- **`PluginRegistry` Engine**: Central registry supporting plugin priority ordering, safe execution isolation (graceful crash recovery), capability verification, and diagnostic collection.
- **Pluggable Reporters (`@cascade-code/reporters`)**: Added reporter interface supporting Markdown (`MarkdownReporter`) and SARIF 2.1.0 (`SarifReporter`) diagnostic formats.
- **Schema 2.0**: Updated analysis JSON payload to schema 2.0 format with backwards-compatible `migrateResultToLatest` migration utility.
- **Testing Utilities (`@cascade-code/test-utils`)**: Shared testing package with mock plugin factories, graph builders, and capability assertion utilities.
- **Automated Test Suite**: Added 22 unit and integration tests covering plugins, graph construction, analysis, reporting, and schema migration.
- **Expanded Dashboard**: Added graph, dependency matrix, cycle, and dead-code views together with impact inspection and export controls.
- **Project Governance**: Added contribution, conduct, security, issue, and pull-request guidance.

### Changed

- Refactored `@cascade-code/core` analysis pipeline to execute file scanning, entrypoint detection, AST parsing, symbol extraction, and module resolution via registered plugins.
- Updated `@cascade-code/cli` commands (`analyze`, `graph`, `deadcode`, `impact`) to handle schema 2.0 models and cross-language edge visualizations.
- Updated root TypeScript configuration (`tsconfig.json`, `tsconfig.base.json`, `vitest.config.ts`) with strict workspace references and path aliases.
- Updated CI to lint, build referenced packages, typecheck, and test across supported Node.js versions.

### Fixed

- Isolated plugin crashes during AST parsing and dependency extraction to prevent total pipeline failure.
- Exported `toPosixRelativePath` utility directly from `@cascade-code/core` root.
- Corrected the frozen lockfile and workspace dependency metadata for reproducible CI installs.
- Aligned the supported Node.js range and CI matrix with the Vite 8/Rolldown runtime requirement.
- Preserved unresolved and external dependency edges instead of silently dropping them or treating every bare specifier as external.
- Excluded generated files, tests, configuration, and assets from dead-code findings.

### Performance

- Baseline on Node.js 22.13.1/Windows: 101 files in 223.0 ms, 1,001 files in 1,894.9 ms, and 5,001 files in 8,427.1 ms. Traversal uses adjacency indexes; each file is parsed once and resolution is cached per analysis run.

## [1.0.0] - 2026-07-27

### Added

- Initial TypeScript monorepo with core analysis, CLI, and React dashboard packages.
- JavaScript and TypeScript file scanning, dependency graph construction, cycle detection, dead-file analysis, and impact simulation.
- CLI commands for analysis, graph inspection, impact reports, dead-code reports, and the dashboard server.

[3.3.0]: https://github.com/AbdulGani07/cascade/releases/tag/v3.3.0
[3.2.0]: https://github.com/AbdulGani07/cascade/releases/tag/v3.2.0
[3.1.1]: https://github.com/AbdulGani07/cascade/releases/tag/v3.1.1
[3.1.0]: https://github.com/AbdulGani07/cascade/releases/tag/v3.1.0
[3.0.0]: https://github.com/AbdulGani07/cascade/releases/tag/v3.0.0
[2.3.0]: https://github.com/AbdulGani07/cascade/releases/tag/v2.3.0
[2.2.0]: https://github.com/AbdulGani07/cascade/releases/tag/v2.2.0
[2.1.0]: https://github.com/AbdulGani07/cascade/releases/tag/v2.1.0
[2.0.0]: https://github.com/AbdulGani07/cascade/releases/tag/v2.0.0
[1.0.0]: https://github.com/AbdulGani07/cascade/commit/1423180
