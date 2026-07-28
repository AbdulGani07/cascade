# Changelog

All notable changes to Cascade will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

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

## [1.0.0] - 2026-07-27

### Added

- Initial TypeScript monorepo with core analysis, CLI, and React dashboard packages.
- JavaScript and TypeScript file scanning, dependency graph construction, cycle detection, dead-file analysis, and impact simulation.
- CLI commands for analysis, graph inspection, impact reports, dead-code reports, and the dashboard server.
