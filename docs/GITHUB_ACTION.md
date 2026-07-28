# Cascade GitHub Action

Use a released, immutable Cascade revision. The action installs and builds its
own trusted analyzer with lifecycle scripts disabled; it never runs build, test,
or package scripts from the repository being analyzed.

## Minimal workflow

```yaml
on: pull_request
permissions: { contents: read }
jobs:
  cascade:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09 # v5
        with: { fetch-depth: 0 }
      # Replace with the immutable commit for the chosen Cascade release.
      - uses: AbdulGani07/cascade@<commit-sha>
        with:
          base: ${{ github.event.pull_request.base.sha }}
          head: ${{ github.event.pull_request.head.sha }}
```

## Full workflow

See [cascade-pr.yml](../.github/workflows/cascade-pr.yml). It resolves PR SHAs,
generates JSON, Markdown, HTML, and SARIF, uploads an artifact, and uploads
SARIF. This Action writes only the job summary, so repeated runs do not create
PR-comment spam. The inputs include repository-relative `path`, `config`, and
`selected-projects`, policy toggles, a graph-size cap, and a timeout.

## Security and permissions

Minimum permission is `contents: read`. SARIF upload additionally requires
`security-events: write`; PR comments require `pull-requests: write` and are
intentionally not performed by this Action. For forks, use `pull_request`, never
check out or execute untrusted PR scripts, and avoid `pull_request_target` unless
a separately reviewed design requires it. Inputs are validated, paths must remain
repository-relative, and the runner uses Node argument arrays rather than shell
interpolation. Pin all third-party actions, including Cascade, to immutable commit
SHAs in production.

## Other CI systems

These are CLI examples, not native integrations:

```yaml
# GitLab CI / CircleCI / Bitbucket Pipelines
script:
  [
    "pnpm install --frozen-lockfile",
    "pnpm build",
    "node packages/cli/dist/index.js diff . --base $BASE_SHA --head HEAD --format json --output cascade.json",
  ]
```

```groovy
// Jenkins
sh 'pnpm install --frozen-lockfile && pnpm build && node packages/cli/dist/index.js diff . --base $GIT_PREVIOUS_SUCCESSFUL_COMMIT --format json --output cascade.json'
archiveArtifacts artifacts: 'cascade.json'
```

```yaml
# Azure Pipelines
- script: pnpm install --frozen-lockfile && pnpm build && node packages/cli/dist/index.js diff . --base $(Build.SourceVersion) --format json --output cascade.json
```

## Release and testing

Release a versioned action by pushing an annotated `vX.Y.Z` tag after CI passes;
the included release workflow creates release notes. Then move a floating major
tag (such as `v3`) to that reviewed release. The Action runner has schema/input
tests alongside the repository's build, typecheck, lint, and integration suites.
Artifact reports are deterministic for the same Git refs and configuration. See
[GITHUB_ACTION_TEST_RESULTS.md](GITHUB_ACTION_TEST_RESULTS.md) for the checked
results for this change.
