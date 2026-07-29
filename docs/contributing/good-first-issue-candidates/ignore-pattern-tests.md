# Test ignore-pattern normalization

## Context and current limitation

Ignore behavior has broad coverage; a focused table for slash direction and redundant separators
would improve cross-platform regression confidence.

## Expected behavior

Add deterministic tests for existing normalization semantics.

## Relevant files

`packages/core/src/parser/fileScanner.ts`, path utilities, associated unit tests.

## Boundaries and non-goals

No glob engine replacement, new syntax, or filesystem traversal expansion.

## Acceptance criteria

- Tests cover POSIX and Windows-style input without platform-dependent expectations.
- Existing security boundaries remain unchanged.

## Testing and documentation

Run focused path/scanner tests and `pnpm run check`; document only verified behavior.

## Difficulty and skills

Easy to moderate; TypeScript, glob semantics, cross-platform paths.
