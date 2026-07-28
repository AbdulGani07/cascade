# Getting started

## 1. Analyze a repository

From the Cascade checkout:

```bash
node packages/cli/dist/index.js analyze test-project
```

Against another repository:

```bash
node /path/to/cascade/packages/cli/dist/index.js analyze /path/to/project
```

The summary reports scanned modules, dependency connections, projects, entry
points, cycles, unreachable files, unresolved imports, languages, and analysis
levels.

## 2. Save machine-readable output

```bash
node packages/cli/dist/index.js analyze test-project --json > analysis.json
```

Reports use project-relative paths by default. Review
[JSON schema](JSON_SCHEMA.md) before building automation around the payload.

## 3. Inspect the graph

```bash
node packages/cli/dist/index.js graph test-project
node packages/cli/dist/index.js graph test-project --project
node packages/cli/dist/index.js projects test-project
```

## 4. Compare Git states

Run this inside a Git worktree:

```bash
node packages/cli/dist/index.js diff . --base main --head WORKING_TREE
node packages/cli/dist/index.js affected-tests . --base main
node packages/cli/dist/index.js risk . --base main
```

These commands estimate impact from static evidence; they do not replace tests
or runtime telemetry.

## 5. Add configuration

```bash
node packages/cli/dist/index.js init .
node packages/cli/dist/index.js config validate .
```

Only add settings you need. Unknown top-level keys are rejected.

## 6. Open the local dashboard

```bash
node packages/cli/dist/index.js dashboard test-project
```

The server binds to loopback and remains active until the CLI process exits.

## Next steps

- Run a [verified example](EXAMPLES.md).
- Configure [architecture rules](ARCHITECTURE_RULES.md).
- Add the [GitHub Action](GITHUB_ACTION.md).
- Review [language capability](CAPABILITY_MATRIX.md).
