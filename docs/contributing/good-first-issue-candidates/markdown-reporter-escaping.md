# Test Markdown reporter escaping

## Context and current limitation

Reporter security is documented, while additional table-driven cases for Markdown punctuation and
multiline diagnostic text would improve regression coverage.

## Expected behavior

Add non-sensitive test inputs and assert valid, deterministic Markdown output.

## Relevant files

`packages/reporters/src/markdownReporter.ts`, reporter unit tests, `docs/REPORTER_DEVELOPMENT.md`.

## Boundaries and non-goals

No reporter API redesign or HTML rendering.

## Acceptance criteria

- Cases cover pipes, backticks, line breaks, and project-relative paths.
- Existing output contracts remain compatible.

## Testing and documentation

Run the focused unit suite and `pnpm run check`; update docs only for a clarified contract.

## Difficulty and skills

Easy; Markdown, Vitest, string escaping.
