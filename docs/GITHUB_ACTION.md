# GitHub Action

The repository ships a composite action that builds its trusted analyzer with dependency lifecycle scripts disabled, analyzes a Git range, and produces Markdown, JSON, SARIF, and HTML artifacts.

## Minimal pull-request workflow

```yaml
name: Cascade
on: pull_request

permissions:
  contents: read

jobs:
  cascade:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
        with:
          fetch-depth: 0
      - uses: AbdulGani07/cascade@<reviewed-commit-sha>
        with:
          base: ${{ github.event.pull_request.base.sha }}
          head: ${{ github.event.pull_request.head.sha }}
```

Replace the placeholder with an immutable reviewed commit. The checked-in example for developing the action locally is [`.github/workflows/cascade-pr.yml`](../.github/workflows/cascade-pr.yml).

## Inputs

| Input                             | Default               | Purpose                                      |
| --------------------------------- | --------------------- | -------------------------------------------- |
| `path`                            | `.`                   | Repository-relative analysis root            |
| `base`                            | PR base SHA           | Base Git ref                                 |
| `head`                            | PR head SHA or `HEAD` | Head Git ref                                 |
| `config`                          | `cascade.config.json` | Repository-relative config path              |
| `selected-projects`               | empty                 | Comma-separated project IDs                  |
| `fail-on-severity`                | `error`               | `info`, `warning`, `error`, or `none`        |
| `fail-on-new-cycles`              | `false`               | Fail for introduced cycles                   |
| `fail-on-architecture-violations` | `true`                | Fail for new unsuppressed findings           |
| `fail-on-unresolved-internal`     | `false`               | Fail for introduced unresolved edges         |
| `max-graph-size`                  | `0`                   | Node cap; zero disables this policy          |
| `timeout-seconds`                 | `900`                 | Analysis timeout from 1 to 3600 seconds      |
| `output-directory`                | `.cascade-artifacts`  | Repository-relative artifact directory       |
| `cache`                           | `true`                | Restore and save the action dependency cache |

## Outputs

The action exposes `conclusion`, `risk-level`, `risk-score`, and paths for Markdown, JSON, SARIF, and HTML reports.

## SARIF permissions

Uploading SARIF requires `security-events: write`. The action itself does not post pull-request comments and does not require `pull-requests: write`.

## Fork safety

- Use the `pull_request` event for untrusted contributions.
- Do not use `pull_request_target` to analyze an untrusted checkout with repository secrets.
- Do not run package, build, test, or configuration scripts from the analyzed repository.
- Pin third-party actions to immutable commits.
- Provide only the permissions required by each job.
- Treat generated reports as potentially sensitive repository metadata.

See [Security](SECURITY.md) and [CI integrations](CI_INTEGRATIONS.md).
