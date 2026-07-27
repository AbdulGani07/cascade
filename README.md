# Cascade

Cascade is a TypeScript dependency-analysis toolkit that predicts the impact of
code changes. It scans JavaScript and TypeScript projects, builds an import
graph, detects cycles and unreachable files, and exposes the results through a
CLI and a React dashboard.

## Requirements

- Node.js 24 or newer
- pnpm 11 or newer

## Development

```bash
pnpm install
pnpm build
```

Analyze the included sample project:

```bash
node packages/cli/dist/index.js analyze test-project
```

Generate JSON for the dashboard:

```bash
node packages/cli/dist/index.js analyze test-project --json > analysis.json
```

## Packages

- `@cascade/core` — scanning, parsing, graph construction, and analysis
- `@cascade/cli` — terminal interface and dashboard server
- `@cascade/dashboard` — interactive React graph visualization
