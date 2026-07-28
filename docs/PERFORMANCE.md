# Cascade performance methodology

## Scope and reproducibility

`benchmarks/performance.mjs` creates deterministic temporary repositories and
runs the production analyzer. It records discovery, project detection, entry
point detection, parsing, module resolution, graph construction, graph
analysis, impact materialization, JSON serialization, dashboard JSON
parse/aggregation, process RSS growth, an unchanged warm rerun, and a one-file
update rerun.

Run after building:

```powershell
pnpm run build
pnpm run benchmark:performance
```

The default scale suite covers 100, 1,000, and 10,000-file chains plus a dense
graph, a large cycle, and unresolved imports. The 50,000-file fixture is opt-in:

```powershell
$env:CASCADE_BENCH_50K = "1"
$env:CASCADE_BENCH_MAX_FILES = "50000"
$env:CASCADE_BENCH_SCALE_ONLY = "1"
pnpm run benchmark:performance
```

Fixtures are generated in lexical order with fixed import topology. Measurements
are single-process wall-clock observations, not promises. Run on an otherwise
idle machine and compare several samples when investigating small changes.
Dashboard loading here means JSON parse plus the production-style top-400 degree
aggregation; it is not a browser paint benchmark.

## Measured baseline and result

Machine: Windows x64, Node 22.13.1, measured 2026-07-28. Historical "before"
numbers are from the checked-in Batch A/3.0 benchmark on the same development
machine. The same legacy linear fixture was rerun after the change.

| Linear fixture |      Before |       After | Change |
| -------------- | ----------: | ----------: | -----: |
| 100 files      |    650.2 ms |    309.1 ms | -52.5% |
| 1,000 files    |  4,019.3 ms |  2,400.9 ms | -40.3% |
| 5,000 files    | 23,106.9 ms | 12,027.0 ms | -47.9% |

The phase suite (structural mode above 1,000 files) measured:

| Fixture      | Analysis | Discovery |  Parse | Resolution | Graph build | Analysis | Serialize | Dashboard prep | Peak RSS growth |
| ------------ | -------: | --------: | -----: | ---------: | ----------: | -------: | --------: | -------------: | --------------: |
| chain 100    |   435 ms |    142 ms |  60 ms |      18 ms |       80 ms |   1.8 ms |    6.5 ms |         2.3 ms |         4.2 MiB |
| chain 1,000  |   2.67 s |    690 ms | 280 ms |     144 ms |      688 ms |   1.1 ms |    275 ms |          47 ms |        64.9 MiB |
| chain 10,000 |  22.75 s |    6.56 s | 1.49 s |     931 ms |      5.21 s |  21.8 ms |    129 ms |          55 ms |         102 MiB |
| chain 50,000 | 127.73 s |   30.06 s | 6.55 s |     4.60 s |     25.34 s |   173 ms |    662 ms |         420 ms |         566 MiB |

Full impact data is intentionally measured only through 1,000 files. A chain's
all-node impact payload is quadratic: the 1,000-file JSON is already 13.0 MiB.
Structural mode (`impact: "none"`) prevents that compatibility payload from
making 10,000 and 50,000-file measurements misleading or exhausting memory.

The dense 250-node/4,000-edge fixture exposed the clearest algorithmic
bottleneck: graph analysis fell from 5,149 ms before SCC condensation to 1.7 ms
afterward. Total analysis fell from 6.11 s to 1.05 s.

## Changes and rationale

- File discovery no longer reads every source merely to count lines. Content is
  read once in graph construction and line counting uses a single character
  scan.
- Plugin selection uses a priority-preserving extension index instead of
  scanning every enabled plugin for every file.
- Cycle analysis uses iterative SCC condensation in O(V + E), returns one
  deterministic cyclic component per SCC, and does not risk recursion overflow.
- `AnalyzeOptions` adds `AbortSignal`, a wall-clock timeout, phase timing, and
  structural impact suppression. Checks occur during directory traversal,
  per-file work, and dependency resolution.
- The dashboard already limits file layouts to the 400 highest-degree nodes.
  The benchmark measures that aggregation path rather than pretending a
  50,000-node browser layout is viable.

## Cache and incremental findings

Cascade currently has only request-local module-resolution caching. The
deterministic fixtures use unique importer/specifier keys, so its measured hit
rate is effectively zero. Unchanged warm reruns and one-file reruns therefore
remain close to cold structural analysis; there is no claim of incremental
speedup. A persistent parser/graph cache was deliberately not added without a
complete invalidation model for configuration, plugin versions, resolver
conditions, file content, and corrupt records. Reusing such entries would risk
stale analysis.

A future cache format must include a schema version, Cascade and plugin
versions, normalized configuration hash, content hash, and atomic checksum. It
must treat parse failure or checksum mismatch as a miss, bound both memory and
disk size, and rebuild reverse edges for changed files only.

## Tradeoffs and remaining limits

- SCC output identifies cyclic components, not every simple cycle. Enumerating
  every cycle in dense graphs can be exponential and is unsuitable for a
  monorepo analyzer.
- Full per-file transitive impact is inherently quadratic on a deep chain.
  Consumers that need large-workspace scalability should request structural
  mode and query impact for selected files.
- Discovery, project detection, and entry-point detection dominate at 50,000
  files. Incremental metadata indexes are the next justified investment.
- Analysis remains synchronous. Cancellation is cooperative between files and
  imports; it cannot interrupt a single native parser call.
- No worker pool was added: current per-file bodies are small, and copying ASTs
  or loading native grammars per worker needs separate evidence to justify the
  startup and memory cost, especially for small repositories.
- Polyglot correctness is covered by the existing fixture suite. The scale
  harness focuses on topology because mixing parser implementations obscures
  graph-algorithm comparisons; language microbenchmarks remain in
  `benchmarks/run.mjs`.

## Regression policy

`pnpm run benchmark:regression` runs a deterministic 20,000-node,
160,000-edge SCC workload. CI allows 2.5 seconds on Node 22, deliberately much
slower than the local result to avoid noisy failures while still catching a
return to superlinear cycle enumeration. Broader end-to-end timings stay
informational because hosted-runner filesystem performance is too variable for
stable tight thresholds.

Realistic expectations on the measured development machine are sub-second for
roughly 100 files, a few seconds for 1,000 files, tens of seconds for 10,000
files, and about two minutes for 50,000 files in structural mode. Hardware,
filesystem, language mix, import density, and unresolved dependencies can move
these values substantially.
