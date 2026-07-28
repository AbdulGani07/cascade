# Impact analysis

Impact analysis estimates which files, projects, tests, services, and owners may be affected by a change. It follows reverse dependency edges from the changed nodes and reports the evidence used.

## Local file impact

```bash
node packages/cli/dist/index.js impact --file src/domain/user.ts
```

Add `--json` for machine-readable output.

## Pull-request impact

```bash
node packages/cli/dist/index.js affected --base origin/main --head HEAD
node packages/cli/dist/index.js affected-tests --base origin/main --head HEAD
node packages/cli/dist/index.js risk --base origin/main --head HEAD
node packages/cli/dist/index.js explain --base origin/main --head HEAD
```

Cascade obtains changed paths from Git, maps them to graph nodes, then traverses dependents. Deleted and renamed paths are handled from Git change metadata where available.

## Before-and-after example

Assume a pull request changes `packages/auth/src/token.ts`.

Before analysis, review scope may be guessed from the changed file list:

```text
1 file changed
packages/auth/src/token.ts
```

After analysis, Cascade can provide evidence such as:

```text
Changed: packages/auth/src/token.ts
Direct dependents:
  apps/api/src/middleware/auth.ts
  packages/auth/src/index.ts
Transitively affected projects:
  apps/api
Suggested tests:
  packages/auth/test/token.test.ts
  apps/api/test/auth.integration.test.ts
```

The exact output depends on repository contents and plugin capability. Suggested tests are candidates, not proof that no other tests are required.

## CI artifacts

```bash
node packages/cli/dist/index.js risk \
  --base origin/main \
  --head HEAD \
  --format sarif \
  --output cascade-risk.sarif
```

Supported diff output formats are `terminal`, `json`, `markdown`, `sarif`, and `html`.

## Interpretation

Impact is an estimate based on observable static relationships. Dynamic dispatch, runtime configuration, generated code, external systems, and unresolved imports can reduce coverage. Review unresolved dependencies and use project-specific tests alongside Cascade’s output.
