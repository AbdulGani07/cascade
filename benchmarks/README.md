# Cascade Benchmarks

The benchmark harness generates deterministic linear dependency graphs in
temporary directories:

- small: 100 source files
- medium: 1,000 source files
- large: 5,000 source files

Run it after building:

```bash
pnpm build
pnpm benchmark
```

Results are machine-dependent. The harness reports wall-clock analysis time and
heap delta and is intended to detect major parsing, resolution, or traversal
regressions.

The second table runs the production Java, Kotlin, C#, and Go structured parsers
and dependency extractors against 1,000 imports. This catches grammar ABI and
language-specific extraction regressions independently of graph traversal.

## Baseline (2026-07-28)

Node.js 22.13.1, Windows:

| Fixture | Files | Edges | Time (ms) | Heap delta (MB) |
| ------- | ----: | ----: | --------: | --------------: |
| small   |   101 |    99 |     223.0 |             3.1 |
| medium  | 1,001 |   999 |   1,894.9 |             6.8 |
| large   | 5,001 | 4,999 |   8,427.1 |           130.1 |
