# Add Windows path examples

## Context and current limitation

Path policy is cross-platform, but contributor-facing examples emphasize POSIX shells.

## Expected behavior

Add verified PowerShell examples with spaces, parentheses, and Unicode paths.

## Relevant files

`docs/GETTING_STARTED.md`, `docs/TROUBLESHOOTING.md`, `tests/unit/windowsPath.test.ts`.

## Boundaries and non-goals

No path-semantics change and no platform-specific promises beyond tested behavior.

## Acceptance criteria

- Commands quote paths safely.
- Examples remain project-relative in output.

## Testing and documentation

Run Windows path tests and `pnpm run test:docs`.

## Difficulty and skills

Easy; PowerShell, Windows paths, Markdown.
