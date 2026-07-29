# Document plugin confidence

## Context and current limitation

Plugin types carry evidence and confidence concepts, but contributors need a compact guide for
choosing confidence levels consistently.

## Expected behavior

Document decisions using verified examples from existing plugins and types.

## Relevant files

`docs/PLUGIN_DEVELOPMENT.md`, `packages/plugin-api/src/types`, existing language plugins.

## Boundaries and non-goals

No confidence algorithm or public type changes.

## Acceptance criteria

- Examples distinguish exact syntax evidence from heuristic inference.
- Unsupported and ambiguous cases are explicit.

## Testing and documentation

Run `pnpm run test:docs`; verify every field name against exported types.

## Difficulty and skills

Easy; technical writing, static-analysis concepts, TypeScript reading.
