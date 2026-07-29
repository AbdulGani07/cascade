# Add a SARIF CLI example

## Context and current limitation

SARIF has a dedicated page, but CLI discovery would benefit from one verified end-to-end command and
output-location example.

## Expected behavior

Add a command that matches implemented options and links to the canonical SARIF page.

## Relevant files

`docs/CLI.md`, `docs/SARIF.md`, CLI reporter commands and tests.

## Boundaries and non-goals

No SARIF schema or GitHub upload workflow changes.

## Acceptance criteria

- The command runs against a checked-in fixture.
- Paths and package names are current.

## Testing and documentation

Run the command locally and `pnpm run test:docs`.

## Difficulty and skills

Easy; CLI usage, Markdown, SARIF familiarity helpful.
