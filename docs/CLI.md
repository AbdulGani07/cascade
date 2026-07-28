# CLI reference

All examples assume:

```bash
alias cascade='node /path/to/cascade/packages/cli/dist/index.js'
```

Use the full `node packages/cli/dist/index.js` command when running from the
Cascade checkout.

## Global options

| Option            | Behavior                                         |
| ----------------- | ------------------------------------------------ |
| `-V`, `--version` | Print the CLI version                            |
| `--quiet`         | Suppress non-essential terminal output           |
| `--verbose`       | Show additional diagnostics                      |
| `--debug`         | Show failure stack traces                        |
| `--no-color`      | Disable ANSI color; `NO_COLOR` is also respected |
| `-h`, `--help`    | Show help                                        |

## Analysis commands

### `analyze <path>`

```bash
cascade analyze .
cascade analyze . --json
cascade analyze . --compact
```

`--json` prints schema 2.0 analysis JSON. Exit status is `1` when cycles or dead
files are present.
`--compact` omits capability and entry-point detail for readable narrow-terminal
demos while preserving measured finding counts.

### `graph <path>`

```bash
cascade graph .
cascade graph . --json
cascade graph . --project
```

`--project` selects the typed project graph instead of file edges.

### `projects <path>`

```bash
cascade projects .
cascade projects . --json
cascade projects . --project packages/api
```

The final form prints reverse project impact for one detected ID.

### `impact <path>`

```bash
cascade impact . --file src/core.ts
cascade impact . --file src/core.ts --json
```

Reports direct and transitive reverse dependencies for the selected file.

### `deadcode <path>`

```bash
cascade deadcode .
cascade deadcode . --json
```

Dead-file findings require sufficiently confident entry-point evidence.

## Git change-impact commands

The following commands share these options:

| Option              | Default        | Values                                          |
| ------------------- | -------------- | ----------------------------------------------- |
| `--base <ref>`      | `HEAD`         | Commit, branch, or tag                          |
| `--head <ref>`      | `WORKING_TREE` | Commit, branch, tag, or `WORKING_TREE`          |
| `--format <format>` | `terminal`     | `terminal`, `json`, `markdown`, `sarif`, `html` |
| `--output <file>`   | stdout         | Output file                                     |
| `--item <id>`       | all            | Used by `explain`                               |

```bash
cascade diff . --base main --head HEAD --format json
cascade affected . --base main
cascade affected-tests . --base main
cascade risk . --base main --format markdown
cascade explain . --base main --item src/index.ts
```

`diff` returns the complete comparison. The other commands select affected
items, candidate tests, the transparent risk calculation, or evidence for one
item.

## Governance

```bash
cascade governance . --format terminal
cascade governance . --format json
cascade governance . --format markdown
cascade governance . --format sarif
```

## Dashboard

```bash
cascade dashboard .
cascade dashboard . --base main --head HEAD --output cascade-dashboard.json
cascade dashboard . --base main --head HEAD --output cascade-dashboard.json --output-only
cascade dashboard . --no-open
```

Starts a token-protected loopback server and opens the browser.
`--base` attaches the implemented Git change-impact report to the dashboard;
`--output` writes the same dataset served by the local API.
`--output-only` requires `--output` and exits without starting the local server.

## Setup and diagnostics

```bash
cascade init .
cascade init . --force
cascade config validate .
cascade doctor .
cascade cache path
cascade cache clear --yes
cascade completion bash
cascade completion zsh
cascade completion fish
```

`cache clear` refuses non-interactive removal without `--yes`.

## Exit codes

| Code | Meaning                                                          |
| ---: | ---------------------------------------------------------------- |
|  `0` | Command completed without its command-specific finding condition |
|  `1` | Analysis findings or a policy gate caused a non-zero result      |
|  `2` | Invalid or missing input                                         |
|  `3` | Analysis or command failure                                      |

Not every command currently normalizes exit codes identically; automation
should inspect both the code and selected output format.

## Verify help

```bash
cascade --help
cascade diff --help
```

Documentation CI extracts command names from this page and checks them against
the registered CLI.
