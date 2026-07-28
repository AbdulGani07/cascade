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

The second table runs the production Java, Kotlin, C#, Go, Rust, C, and C++
structured parsers and dependency extractors against 1,000 imports. This catches
grammar ABI and language-specific extraction regressions independently of graph
traversal.

## Batch A baseline (2026-07-28)

Windows development machine:

| Fixture | Files | Edges | Time (ms) | Heap delta (MB) |
| ------- | ----: | ----: | --------: | --------------: |
| small   |   101 |    99 |     656.3 |             2.3 |
| medium  | 1,001 |   999 |   8,119.2 |            12.4 |
| large   | 5,001 | 4,999 |  41,939.5 |           125.0 |

| Language | Imports | Parse + extract (ms) |
| -------- | ------: | -------------------: |
| Java     |   1,000 |                385.6 |
| Kotlin   |   1,000 |                150.3 |
| C#       |   1,000 |                121.2 |
| Go       |   1,000 |                 82.2 |
| Rust     |   1,000 |                158.4 |
| C        |   1,000 |                 86.1 |
| C++      |   1,000 |                 76.2 |
