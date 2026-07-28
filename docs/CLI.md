# Cascade CLI reference

Cascade is designed to start with one command:

```sh
cascade analyze .
```

The published npm package name for the requested `npx cascade-analyzer` journey
has **not** been verified. The project owner must confirm npm availability and
ownership before that name is placed in package metadata, release workflows, or
documentation. Until then, use the repository binary or the verified scoped CLI
package name when it is published.

## Command groups

| Group         | Commands                                                   |
| ------------- | ---------------------------------------------------------- |
| Analysis      | `analyze`, `graph`, `projects`, `impact`, `deadcode`       |
| Change impact | `diff`, `affected`, `affected-tests`, `risk`, `explain`    |
| Governance    | `governance`                                               |
| Setup         | `init`, `config validate`, `doctor`, `cache`, `completion` |

Run `cascade --help` or `cascade <command> --help` for the authoritative option
list. JSON commands keep stdout machine-readable; diagnostics go to stderr.

## First run

```sh
cascade doctor .
cascade init .
cascade config validate .
cascade analyze .
```

`init` will not overwrite an existing configuration without `--force`.

## Output and automation

Use `--json` where a command supports it. Change-impact commands support
`--format json|markdown|html|sarif` and `--output report.ext`. `graph` and the
project graph can be consumed as JSON. The stable exit-code contract is:

| Code | Meaning                                                                   |
| ---- | ------------------------------------------------------------------------- |
| 0    | Analysis completed without configured findings that fail the command      |
| 1    | Analysis completed and found reportable cycles/dead files/policy failures |
| 2    | Invalid input or missing target                                           |
| 3    | Analysis, configuration, or Git failure                                   |

Use `NO_COLOR=1` or `--no-color` for logs. `--quiet` is intended for scripts,
and `--verbose`/`--debug` expose more diagnostics. Avoid parsing formatted tables;
use JSON instead.

## Completion

```sh
# bash
source <(cascade completion bash)

# zsh
source <(cascade completion zsh)

# fish
cascade completion fish | source
```

## Troubleshooting

- Run `cascade doctor .` first when a repository is not detected as expected.
- Run `cascade config validate .` after editing `cascade.config.json`.
- Use an absolute or quoted relative path for directories with spaces, Unicode,
  parentheses, or shell-special characters: `cascade analyze "my project (β)"`.
- In CI, pass Git refs explicitly to `diff`, and use a checkout with sufficient
  history. Shallow clones can limit comparison evidence.
- `cache clear --yes` is required in non-interactive CI. It removes only
  Cascade's own cache directory.
- `affected-tests` reports candidates with evidence; it does not prove test
  sufficiency.
