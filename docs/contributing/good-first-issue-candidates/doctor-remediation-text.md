# Improve doctor remediation text

## Context and current limitation

The `doctor` command can make some remediation messages more actionable without changing detection.

## Expected behavior

Audit current messages and add concise next commands where the remedy is unambiguous.

## Relevant files

`packages/cli/src/commands/platform.ts`, CLI unit/e2e tests, `docs/CLI.md`.

## Boundaries and non-goals

Do not execute remedies, install dependencies, or infer unsafe filesystem changes.

## Acceptance criteria

- Messages are deterministic and platform-appropriate.
- Tests cover every changed message.

## Testing and documentation

Run relevant CLI tests and documentation validation.

## Difficulty and skills

Easy; TypeScript, CLI UX, Vitest.
