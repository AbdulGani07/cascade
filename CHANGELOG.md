# Changelog

All notable changes to Cascade will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

- First-party `@cascade/language-python` plugin for `.py` and `.pyi`, including absolute, relative, conditional, local, `TYPE_CHECKING`, literal `importlib.import_module`, and literal `__import__` dependencies.
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

- **Pluggable Language Architecture (`@cascade/plugin-api`)**: Introduced standardized `LanguagePlugin`, `Parser`, `DependencyExtractor`, `SymbolExtractor`, `ModuleResolver`, and `Reporter` SPI interfaces.
- **Shared Configuration (`@cascade/config`)**: Added validated configuration models used consistently by the CLI, core engine, and plugins.
- **First-Party Language Plugins**:
  - `@cascade/language-javascript`: Plugin for JavaScript/JSX file parsing and module resolution.
  - `@cascade/language-typescript`: Plugin for TypeScript/TSX file parsing, type-only import detection, and symbol extraction.
- **`PluginRegistry` Engine**: Central registry supporting plugin priority ordering, safe execution isolation (graceful crash recovery), capability verification, and diagnostic collection.
- **Pluggable Reporters (`@cascade/reporters`)**: Added reporter interface supporting Markdown (`MarkdownReporter`) and SARIF 2.1.0 (`SarifReporter`) diagnostic formats.
- **Schema 2.0**: Updated analysis JSON payload to schema 2.0 format with backwards-compatible `migrateResultToLatest` migration utility.
- **Testing Utilities (`@cascade/test-utils`)**: Shared testing package with mock plugin factories, graph builders, and capability assertion utilities.
- **Automated Test Suite**: Added 22 unit and integration tests covering plugins, graph construction, analysis, reporting, and schema migration.
- **Expanded Dashboard**: Added graph, dependency matrix, cycle, and dead-code views together with impact inspection and export controls.
- **Project Governance**: Added contribution, conduct, security, issue, and pull-request guidance.

### Changed

- Refactored `@cascade/core` analysis pipeline to execute file scanning, entrypoint detection, AST parsing, symbol extraction, and module resolution via registered plugins.
- Updated `@cascade/cli` commands (`analyze`, `graph`, `deadcode`, `impact`) to handle schema 2.0 models and cross-language edge visualizations.
- Updated root TypeScript configuration (`tsconfig.json`, `tsconfig.base.json`, `vitest.config.ts`) with strict workspace references and path aliases.
- Updated CI to lint, build referenced packages, typecheck, and test across supported Node.js versions.

### Fixed

- Isolated plugin crashes during AST parsing and dependency extraction to prevent total pipeline failure.
- Exported `toPosixRelativePath` utility directly from `@cascade/core` root.
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

[2.3.0]: https://github.com/AbdulGani07/cascade/releases/tag/v2.3.0
[2.2.0]: https://github.com/AbdulGani07/cascade/releases/tag/v2.2.0
[2.1.0]: https://github.com/AbdulGani07/cascade/releases/tag/v2.1.0
[2.0.0]: https://github.com/AbdulGani07/cascade/releases/tag/v2.0.0
[1.0.0]: https://github.com/AbdulGani07/cascade/commit/1423180
