# CI integrations

Cascade can run in any CI environment that provides Node.js, pnpm, the repository history needed for the selected Git range, and a built Cascade checkout.

## Generic CI

```bash
corepack enable
pnpm install --frozen-lockfile
pnpm run build
node packages/cli/dist/index.js risk \
  --base origin/main \
  --head HEAD \
  --format sarif \
  --output cascade-risk.sarif
```

For shallow clones, fetch the base revision before running diff commands.

## Useful exit behavior

Analysis commands may return a non-zero status when findings or invalid inputs require attention. Test the behavior in your policy branch before making a job blocking.

## Artifacts

- JSON is suitable for internal automation.
- Markdown is suitable for job summaries and pull-request comments.
- SARIF is suitable for code-scanning systems.
- HTML is suitable for downloadable review artifacts.

Never publish an artifact before applying the repository’s disclosure policy. Cascade defaults to project-relative paths and report redaction, but reports can still reveal project structure.

## GitHub Actions

Use the repository action described in [GitHub Action](GITHUB_ACTION.md). Keep workflow permissions minimal and treat pull requests from forks as untrusted input.

## Regression checks for Cascade itself

The repository CI builds, lints, type-checks, tests, validates documentation, audits dependencies, and runs performance thresholds where the benchmark environment is stable. See [Contributing](../CONTRIBUTING.md) and [Performance](PERFORMANCE.md).
