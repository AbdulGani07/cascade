# Cascade

Current release: **3.1.0** (2026-07-28)

Cascade is a modular, pluggable dependency-analysis and code-intelligence toolkit that predicts the impact of code changes. It scans multi-language repositories, builds dependency graphs, detects cycles and unreachable code, and exposes actionable results through a CLI, reporters (Markdown, SARIF), and a React dashboard.

It also builds an evidence-backed project/workspace graph for polyglot monorepos,
including packages, services, build modules, deployment units, and typed
relationships between them.

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
- `@cascade/language-java` — Java AST analysis with Maven, Gradle, JPMS, Spring Boot, and JUnit awareness
- `@cascade/language-kotlin` — Kotlin AST analysis for JVM, Gradle Kotlin DSL, Android, and multiplatform projects
- `@cascade/language-csharp` — C# AST analysis with SDK projects, solutions, project references, and ASP.NET Core awareness
- `@cascade/language-go` — Go AST analysis with modules, workspaces, replace directives, internal packages, and cgo evidence
- `@cascade/language-rust` — Rust syntax-tree analysis with Cargo workspace, module, include, and crate resolution
- `@cascade/language-c` — C syntax-tree analysis with preprocessor includes and native build metadata
- `@cascade/language-cpp` — C++ syntax-tree analysis with header dependencies and native build metadata
- `@cascade/language-expanded` — Structured first-party plugins for Batches B–D, including scripting, component, document, style, GraphQL, and optional SQL analysis
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
- [Java and Kotlin capability matrices](docs/JVM_LANGUAGE_SUPPORT.md)
- [C# capability matrix](docs/languages/csharp.md)
- [Go capability matrix](docs/GO_SUPPORT.md)
- [Rust capability matrix](docs/RUST_SUPPORT.md)
- [C and C++ capability matrices](docs/C_CPP_SUPPORT.md)
- [Expanded Batches B–D capability matrices](docs/EXPANDED_LANGUAGE_SUPPORT.md)
- [Project and workspace intelligence](docs/PROJECT_WORKSPACE_INTELLIGENCE.md)
