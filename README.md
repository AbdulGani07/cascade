# Cascade

## Understand what changes before they break something

Cascade maps dependencies across supported languages, detects architectural
risks, and explains the likely blast radius of code changes. It combines a
static-analysis CLI, pull-request reports, architecture policies, a local
dashboard, a GitHub Action, and a VS Code extension.

Cascade reports evidence from source and build metadata. Results depend on each
language plugin's capability and do not guarantee runtime behavior or safe
refactoring.

![Cascade dashboard overview](docs/assets/dashboard-overview.png)

> Demo assets live in [`docs/assets`](docs/assets). See the
> [dashboard guide](docs/DASHBOARD.md) for the capture workflow.

## Try it in 30 seconds

Cascade 3.3.0 currently runs from the repository; an npm package name is not yet
published.

```bash
git clone https://github.com/AbdulGani07/cascade.git
cd cascade
corepack enable
pnpm install --frozen-lockfile
pnpm build
node packages/cli/dist/index.js analyze test-project
```

The first command prints a summary such as:

```text
CASCADE Architecture Analysis Summary
Total Scanned Modules      3
Dependency Connections     2
Detected Entry Points      1
Circular Import Loops      0
Unreferenced Dead Files    0
Languages                  typescript
```

Counts depend on the repository. `analyze` exits with `1` when cycles or dead
files are reported, `2` for invalid input, and `3` for analysis failure.

## Reproducible product demo

The [Cascade Commerce demo](examples/cascade-commerce/README.md) generates a
small TypeScript, Node.js, Python, and Go repository with real Git refs for a
cycle-introducing PR and a safe dead-code removal. Its scripts invoke the built
CLI to produce terminal, JSON, Markdown, SARIF, HTML, and dashboard artifacts;
the committed screenshots are captured from that generated dataset.

## What Cascade provides

- File and project dependency graphs with forward and reverse indexes
- Cycle detection, entry-point evidence, and unreachable-file findings
- Git change comparison, affected items, candidate tests, and evidence paths
- A transparent change-risk indicator—never a production-failure prediction
- Versioned architecture rules with suppressions and SARIF output
- Project detection for common package, workspace, build, and deployment files
- Local React dashboard with bounded graph rendering and report export
- Composite GitHub Action and documented examples for other CI systems
- Local editor service and VS Code extension with saved-file refresh
- Plugin and reporter APIs for extending analysis

## Language support

| Capability level | Meaning                                                          |
| ---------------- | ---------------------------------------------------------------- |
| Structured       | Grammar-backed parsing plus language-aware extraction/resolution |
| Syntax-aware     | Structured or targeted parsing with useful dependency evidence   |
| Pattern-based    | Bounded text extraction; confidence and limitations matter more  |
| Metadata/asset   | Relationships from configuration, documents, styles, or assets   |

| Level              | Languages and formats                                      |
| ------------------ | ---------------------------------------------------------- |
| Structured         | JavaScript, TypeScript, Java, Kotlin, C#, Go, Rust, C, C++ |
| Syntax-aware       | Python, PHP, Ruby, Swift, Dart                             |
| Pattern-based      | Shell, PowerShell, Lua, R                                  |
| Component/document | Vue, Svelte, HTML, CSS/Sass/Less, GraphQL                  |
| Optional           | SQL analysis exists but is disabled by default             |

See the [supported-language guide](docs/LANGUAGE_SUPPORT.md) and
[capability matrix](docs/CAPABILITY_MATRIX.md) for exact parser, symbol,
resolution, project, and limitation details.

## Supported project types

Cascade detects evidence for JavaScript workspaces, Python projects, Maven and
Gradle builds, .NET solutions/projects, Go modules/workspaces, Cargo
packages/workspaces, CMake/Meson/native builds, infrastructure/configuration
projects, services, packages, applications, tests, and deployment units.
Detection is static and does not execute build tools.

[Project detection reference →](docs/PROJECT_DETECTION.md)

## Pull-request analysis

```bash
node packages/cli/dist/index.js diff . --base main --head HEAD --format markdown
node packages/cli/dist/index.js affected . --base main --head HEAD
node packages/cli/dist/index.js affected-tests . --base main --head HEAD
node packages/cli/dist/index.js risk . --base main --head HEAD
```

A report distinguishes changed files, dependency evidence, candidate tests,
new cycles, new unresolved dependencies, architecture findings, and the factors
that contribute to the risk score.

[Before-and-after PR example →](docs/IMPACT_ANALYSIS.md#before-and-after-example)

## Architecture rules

```json
{
  "architectureGovernance": {
    "version": "1",
    "rules": [
      {
        "id": "domain-does-not-import-ui",
        "from": ["packages/domain/**"],
        "to": ["packages/ui/**"],
        "deny": ["packages/ui/**"],
        "severity": "error"
      }
    ]
  }
}
```

```bash
node packages/cli/dist/index.js governance . --format sarif
```

[Architecture-rule reference →](docs/ARCHITECTURE_RULES.md)

## Dashboard, GitHub Action, and IDE

```bash
node packages/cli/dist/index.js dashboard .
```

The dashboard binds to `127.0.0.1`, uses a random local session token, and does
not intentionally send source code to a remote service.

```yaml
- uses: AbdulGani07/cascade@v3.3.0
  with:
    base: ${{ github.event.pull_request.base.sha }}
    head: ${{ github.event.pull_request.head.sha }}
```

The repository also contains the `cascade-code-intelligence` VS Code extension
source and a JSON-lines editor service. Background analysis is opt-in.

- [Dashboard](docs/DASHBOARD.md)
- [GitHub Action](docs/GITHUB_ACTION.md)
- [VS Code extension](docs/VSCODE_EXTENSION.md)

## Configuration

Create and validate a starter file:

```bash
node packages/cli/dist/index.js init .
node packages/cli/dist/index.js config validate .
```

```json
{
  "entryPoints": ["src/index.ts"],
  "ignore": ["**/node_modules/**", "**/dist/**"],
  "selectedProjects": [],
  "symlinks": "ignore",
  "maxFiles": 100000,
  "maxFileSizeBytes": 5242880,
  "maxTotalBytes": 1073741824,
  "architectureGovernance": { "version": "1", "rules": [] }
}
```

[Configuration reference →](docs/CONFIGURATION.md)

## Privacy, security, and performance

Cascade does not intentionally execute analyzed source, package scripts, build
tools, or framework configuration. Reports use project-relative paths and
apply heuristic secret redaction. Third-party plugins are trusted in-process
code and are not sandboxed.

Measured on the documented Windows/Node 22 machine, a 100-file fixture was
sub-second, 1,000 files took a few seconds, 10,000 files took tens of seconds,
and the 50,000-file structural fixture took about two minutes. Language mix,
filesystem, graph density, and impact-output size materially affect results.

- [Security model](docs/SECURITY.md)
- [Performance methodology](docs/PERFORMANCE.md)

## How it compares

| Tool category               | Typical focus                   | Cascade's focus                                                 |
| --------------------------- | ------------------------------- | --------------------------------------------------------------- |
| Package dependency checkers | Manifest/package versions       | File and project relationships from source and metadata         |
| Linters                     | Rules within files or ASTs      | Cross-file graph, change impact, and architecture boundaries    |
| Build graphs                | Tasks and declared packages     | Language-plugin evidence plus detected project relationships    |
| Code search                 | Finding text/symbol occurrences | Directed dependencies, reverse impact, cycles, and explanations |

Cascade can complement these tools; it does not replace compilers, tests,
coverage, runtime tracing, vulnerability scanners, or code review.

## Documentation

Start at the [documentation index](docs/README.md). Popular guides:

- [Installation](docs/INSTALLATION.md)
- [Getting started](docs/GETTING_STARTED.md)
- [CLI reference](docs/CLI.md)
- [Examples](docs/EXAMPLES.md)
- [Plugin development](docs/PLUGIN_DEVELOPMENT.md)
- [JSON schema](docs/JSON_SCHEMA.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [FAQ](docs/FAQ.md)

## Roadmap

Near-term work is tracked through GitHub issues and the
[roadmap](docs/ROADMAP.md): stronger incremental analysis, safer plugin
isolation, schema publication, more browser-scale dashboard aggregation, and
additional language-specific resolution evidence. Items are plans, not
commitments.

## Contributing and governance

Read [CONTRIBUTING.md](CONTRIBUTING.md), the
[governance model](docs/GOVERNANCE.md), and the
[Code of Conduct](CODE_OF_CONDUCT.md). Run `pnpm check` and
`pnpm run test:docs` before opening a pull request.

## Citation and academic use

Cascade does not currently publish a paper or DOI. Academic users may cite the
repository URL, release tag, and commit SHA. See [CITATION.cff](CITATION.cff)
for machine-readable metadata.

## License

[MIT](LICENSE) © Cascade contributors.
