# Cascade

Current release: **2.0.0** (2026-07-28)

Cascade is a modular, pluggable dependency-analysis and code-intelligence toolkit that predicts the impact of code changes. It scans multi-language repositories, builds dependency graphs, detects cycles and unreachable code, and exposes actionable results through a CLI, reporters (Markdown, SARIF), and a React dashboard.

## Requirements

- Node.js 22.13 or newer
- pnpm 9.15.0

## Development

```bash
pnpm install
pnpm build
pnpm test
```

Analyze a project:

```bash
node packages/cli/dist/index.js analyze test-project
```

Generate Schema 2.0 JSON output:

```bash
node packages/cli/dist/index.js analyze test-project --json > analysis.json
```

Additional commands:

```bash
node packages/cli/dist/index.js graph test-project
node packages/cli/dist/index.js deadcode test-project
node packages/cli/dist/index.js impact test-project
node packages/cli/dist/index.js dashboard test-project
```

Run the complete validation pipeline before submitting changes:

```bash
pnpm check
```

## Workspace Packages

- `@cascade/plugin-api` — Core SPI interfaces for language plugins, parsers, extractors, resolvers, and reporters
- `@cascade/config` — Shared Cascade configuration parsing and validation
- `@cascade/core` — PluginRegistry engine, graph algorithms, entry point detection, impact simulation, and JSON exporter
- `@cascade/language-javascript` — Language plugin for JavaScript/JSX parsing and dependency extraction
- `@cascade/language-typescript` — Language plugin for TypeScript/TSX parsing, type-only imports, and symbol extraction
- `@cascade/language-python` — Python/Python-stub dependency extraction, package resolution, framework detection, and diagnostics
- `@cascade/reporters` — Diagnostic reporters including Markdown summary (`MarkdownReporter`) and SARIF 2.1.0 (`SarifReporter`)
- `@cascade/cli` — Command-line interface and terminal user interface
- `@cascade/dashboard` — Interactive React Flow graph visualizer
- `@cascade/test-utils` — Mock plugin generation and isolated graph testing harness

## Project Documentation

- [Changelog](CHANGELOG.md)
- [Contributing guide](CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Architecture audit and roadmap](CASCADE_AUDIT_AND_ROADMAP.md)
- [JavaScript/TypeScript support matrices](docs/LANGUAGE_SUPPORT.md)
- [Python support and capability matrix](docs/PYTHON_SUPPORT.md)
