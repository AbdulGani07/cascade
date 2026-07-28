# Changelog

All notable changes to Cascade will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[2.0.0]: https://github.com/AbdulGani07/cascade/releases/tag/v2.0.0
[1.0.0]: https://github.com/AbdulGani07/cascade/commit/1423180
