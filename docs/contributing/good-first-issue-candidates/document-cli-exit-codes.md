# Document CLI exit codes

## Context and current limitation

CLI command pages show usage but do not provide one concise map of success, validation, and failure
exit behavior.

## Expected behavior

Document only exit behavior verified from `packages/cli/src` and tests.

## Relevant files

`docs/CLI.md`, `packages/cli/src/index.ts`, `tests/e2e/cliSmoke.test.ts`.

## Boundaries and non-goals

Documentation and focused tests only; do not redesign error handling.

## Acceptance criteria

- Each documented code has source/test evidence.
- Examples use `@cascade-code/cli` and `cascade`.

## Testing and documentation

Run `pnpm run test:e2e` and `pnpm run test:docs`.

## Difficulty and skills

Easy; Markdown, CLI testing, TypeScript reading.
