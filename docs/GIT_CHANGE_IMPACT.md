# Git change-impact analysis

Cascade compares a base Git ref with a commit, branch, tag, or the working tree.
It reports changed/added/deleted/renamed/copied files, changed-line symbols where
available, direct and transitive dependents, affected projects/services/entry
points/tests, graph differences, cycle changes, and introduced unresolved imports.

```bash
cascade diff . --base main --head HEAD --format json
cascade affected . --base origin/main
cascade affected-tests . --base HEAD
cascade risk . --base main --format markdown
cascade explain . --base main --item packages/core/src/index.ts
```

`--head WORKING_TREE` is the default and includes staged, unstaged, and untracked
files. Immutable refs are materialized in detached temporary Git worktrees, then
removed. If a shallow clone lacks the requested ref, Cascade returns a deterministic
`GIT_HISTORY_UNAVAILABLE` or `GIT_SNAPSHOT_UNAVAILABLE` diagnostic instead of
inventing a comparison.

## Evidence and confidence

Findings contain evidence and `high`, `medium`, or `low` confidence. Direct
resolved imports are high confidence; filename conventions and configured mappings
are medium unless user-supplied coverage maps confirm them. Affected tests are
candidates, not proof of sufficient coverage.

## Transparent risk model

The score is capped at 100 and each non-zero factor reports `weight × observed
value`: changed files (1), direct dependents (2), transitive dependents (1), entry
points (8), public symbols (6), tests (1), services (6), introduced cycles (15),
architecture violations (12), unresolved imports (8), ownership boundaries (4),
and critical paths (10). It is a prioritization signal, never a prediction of
production failure.

Configure it in `cascade.config.json`:

```json
{
  "gitImpact": {
    "criticalPaths": ["services/payments/"],
    "testMappings": { "src/api.ts": ["tests/api.test.ts"] },
    "coverageMap": { "src/api.ts": ["tests/api.test.ts"] },
    "architectureRules": [{ "id": "ui-to-db", "from": "apps/ui/**", "to": "infra/**" }],
    "riskWeights": { "introducedCycles": 20 }
  }
}
```

Architecture rules flag newly introduced edges matching `from` and `to` patterns;
they do not retroactively report pre-existing violations. JSON, terminal, Markdown,
SARIF, and self-contained HTML output are deterministic and CI-friendly.
