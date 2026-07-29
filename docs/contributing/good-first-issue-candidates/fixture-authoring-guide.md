# Improve the fixture authoring guide

## Context and current limitation

Fixtures span many ecosystems, but contributor guidance is distributed across tests and plugin docs.

## Expected behavior

Add a concise section covering minimality, provenance, hostile inputs, generated markers, and the
rule against executing fixtures.

## Relevant files

`tests/fixtures/README.md`, `CONTRIBUTING.md`, `docs/PLUGIN_DEVELOPMENT.md`.

## Boundaries and non-goals

No fixture rewrite, new language claim, or external code import.

## Acceptance criteria

- Guidance distinguishes unit, integration, and framework fixtures.
- Licensing and sensitive-data cautions are explicit.

## Testing and documentation

Run `pnpm run test:docs`; validate links and commands.

## Difficulty and skills

Easy; technical writing, test organization, open-source hygiene.
