# Add dashboard empty-state test

## Context and current limitation

Dashboard component tests cover populated analysis views; an empty valid graph deserves explicit UX
coverage.

## Expected behavior

Verify the existing empty state is accessible, stable, and free of runtime errors.

## Relevant files

`packages/dashboard/src/components`, `tests/unit/dashboardComponents.test.ts`.

## Boundaries and non-goals

No visual redesign, new framework, or screenshot tooling.

## Acceptance criteria

- A minimal valid empty dataset renders.
- The test asserts useful visible text and no fabricated findings.

## Testing and documentation

Run dashboard unit tests and `pnpm run build`; update dashboard docs only if wording changes.

## Difficulty and skills

Easy; React, Vitest, accessibility basics.
