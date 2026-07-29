# Add JSON configuration typo fixtures

## Context and current limitation

Configuration validation covers invalid data, but a small table of realistic misspelled keys would
make diagnostics easier to protect.

## Expected behavior

Add fixtures and assertions for representative unknown keys without weakening strict validation.

## Relevant files

`packages/config`, `packages/core/src/config`, and configuration unit tests.

## Boundaries and non-goals

No fuzzy autocorrection, schema redesign, or new configuration fields.

## Acceptance criteria

- Deterministic diagnostics identify the offending key.
- Existing valid configurations remain accepted.

## Testing and documentation

Run focused unit tests, `pnpm run typecheck`, and update `docs/CONFIGURATION.md` only if behavior needs clarification.

## Difficulty and skills

Easy; TypeScript, JSON fixtures, Vitest.
