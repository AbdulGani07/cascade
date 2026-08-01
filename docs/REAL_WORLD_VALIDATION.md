# Real-world validation

Cascade's real-world corpus is an explicit benchmark, not a normal unit test. It statically analyzes
immutable public source snapshots without cloning repositories or running any code from them. The
weekly/manual workflow is intentionally not required on pull requests.

## Pinned corpus

| Category            | Repository                                                                                                | Commit                                     | License          | Scope            |
| ------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ---------------- | ---------------- |
| TypeScript monorepo | [changesets/changesets](https://github.com/changesets/changesets)                                         | `719ce8c64758874de3128a60aa020bfe871c976c` | MIT              | Whole repository |
| Python project      | [pallets/click](https://github.com/pallets/click)                                                         | `00e592cea702e0b2caa0dee42489fdb1c22cd845` | BSD-3-Clause     | Whole repository |
| Java multi-module   | [spring-guides/gs-multi-module](https://github.com/spring-guides/gs-multi-module)                         | `d88a2b721bda3798a6a934987157498e66da06c5` | Apache-2.0       | `complete`       |
| .NET solution       | [jbogard/ContosoUniversityDotNetCore-Pages](https://github.com/jbogard/ContosoUniversityDotNetCore-Pages) | `abb4c08bd4fbc14fc2ea6c56b31c3381d83ea9ab` | MIT              | Whole repository |
| Go modules          | [golang/example](https://github.com/golang/example)                                                       | `7f05d217867b2af52b0a28c6d1c91df97e1b5b39` | BSD-3-Clause     | Whole repository |
| Rust workspace      | [BurntSushi/ripgrep](https://github.com/BurntSushi/ripgrep)                                               | `435f59fc4b43af3ab32f34d53fa34978f393fe52` | MIT OR Unlicense | Whole repository |
| C++ CMake           | [fmtlib/fmt](https://github.com/fmtlib/fmt)                                                               | `e2243a6a7f4a8c09e9233a253f3d1f71e45d8cef` | MIT              | Whole repository |
| Polyglot            | [bazelbuild/examples](https://github.com/bazelbuild/examples)                                             | `dbf3399037ae65f901d46147804749fae1409ef2` | Apache-2.0       | Whole repository |

Licenses and commit SHAs were verified from the upstream repository metadata at corpus selection
time. The original `dotnet/samples` selection was replaced because its whole-repository archive
exceeded the runner's 128 MiB compressed safety cap even though only a small subdirectory was in
scope; the replacement is a small MIT-licensed solution pinned through the official GitHub API.
Updating a commit is a reviewed corpus change: verify its license again, inspect structural
changes, run the benchmark with `--update-snapshots`, explain every changed expectation, and then
run normal validation without that flag.

## Safety and reproducibility

The runner downloads only `https://codeload.github.com` archives derived from the allowlisted HTTPS
repository URLs and full 40-character commits in `benchmarks/real-repositories.json`. Downloads are
cached by corpus-manifest hash. Each archive gets a SHA-256 sidecar and is rechecked before use.

Extraction is implemented in Node. It validates the single expected archive root, normalizes every
path, rejects traversal and special entries, ignores link entries without dereferencing them, and
writes regular files without executable permissions. PAX metadata is accepted only to recover a
path that is then subjected to the same checks. Repository Git hooks do not exist because the runner
does not clone.

Cascade reads the extracted source and metadata as data. The runner never invokes npm, pnpm, Yarn,
Gradle, Maven, Cargo, Go, Python, CMake, MSBuild, shell scripts, repository executables, or repository
hooks. It does not install repository dependencies. Only Cascade itself is built before analysis.

Run explicitly:

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm run benchmark:real
```

Use `--cache <directory>` and `--output <file>` to choose locations. Do not use
`--update-snapshots` merely to make a failure green; it is an explicit baseline-authoring operation.

## Baseline observations

Measurements below are from Windows, Node 22.13.1, with `impact: "none"`. Durations and peak RSS are
observations, not portable exact expectations; committed thresholds allow substantial CI variance.

| Corpus              | Files | Nodes | Edges | Resolved | Unresolved | External | Cycles | Warnings |   Time | Peak RSS |
| ------------------- | ----: | ----: | ----: | -------: | ---------: | -------: | -----: | -------: | -----: | -------: |
| changesets          |   426 |   217 |   735 |      413 |          0 |      322 |      1 |        8 |  6.8 s |  156 MiB |
| Click               |   165 |    85 |   674 |      316 |        113 |      239 |      2 |      154 |  3.6 s |  124 MiB |
| Spring multi-module |    22 |     5 |    18 |        2 |          4 |       12 |      0 |        4 |  1.4 s |  104 MiB |
| Contoso University  |   134 |    83 |   559 |        2 |          7 |      404 |      1 |      153 |  4.7 s |  181 MiB |
| Go examples         |    71 |    51 |   233 |        4 |          5 |      224 |      0 |      450 |  4.7 s |  140 MiB |
| ripgrep             |   236 |   129 |   481 |      158 |        139 |      184 |      1 |      854 | 43.6 s |  433 MiB |
| fmt                 |   142 |    80 |   704 |      154 |         17 |      533 |      1 |    2,175 | 27.7 s |  407 MiB |
| Bazel examples      |   687 |   239 |   342 |       81 |        114 |      145 |      0 |      246 | 14.9 s |  145 MiB |

`fileCount` counts regular files in the selected snapshot scope; `nodeCount` counts files recognized
by Cascade plugins. External dependencies are evidence, not missing graph nodes. Warning totals
include parse diagnostics and safely skipped archive links.

## Regression policy

The committed snapshot contains only the pinned commit, structural counts, dependency status counts,
cycle/warning counts, and conservative thresholds. It contains no timestamps, absolute paths,
download locations, phase timings, or machine-specific memory observations.

Validation fails on a crash, commit mismatch, missing snapshot, node/edge count outside broad bounds,
warning growth above twice the baseline plus margin, duration above at least four times the observed
baseline, or peak RSS above at least twice baseline. Node floors are 70% of baseline; edge floors are
60%. These detect catastrophic regressions while allowing intentional parser improvements. Any
threshold or snapshot update requires a written behavior explanation.

## Accuracy and support limitations

- Dynamic imports, Python runtime path mutation, reflection, generated sources, macros, conditional
  compilation, and dependencies created by build tools remain approximate or unresolved.
- Java parsing scales poorly on larger framework repositories. Both Guava (3,317 files) and Guice
  (801 files) exceeded the three-minute isolated limit before parsing completed. The scheduled corpus
  therefore uses Spring's small real multi-module guide; large-Java performance remains open work.
- Go standard-library and module imports are usually classified external without downloading the
  module graph. The high warning count shows that metadata/external evidence is noisy.
- Rust macro expansion, `build.rs`, features, and Cargo target evaluation are not executed. ripgrep
  is the slowest retained corpus and has substantial unresolved evidence.
- `.h` is inherently ambiguous. In fmt, C++ headers are currently selected by the C plugin and emit
  partial-parse diagnostics. Cascade now caps C/C++ parser diagnostics at 50 per file and emits an
  explicit truncation warning; this reduced fmt warnings from 30,005 to 2,175. Contextual header
  language selection remains unsupported.
- Bazel/Starlark target semantics are not modeled, and 20 upstream archive links are safely ignored.
- Reported cycles are static graph cycles and can include examples or test-only relationships; they
  are not proof of a runtime initialization cycle.

## Workflow

`.github/workflows/real-world-validation.yml` runs every Monday at 03:37 UTC or by manual dispatch.
It is restricted to `AbdulGani07/cascade`, uses pinned actions, installs through the frozen lockfile,
builds Cascade, restores only pinned archive downloads from cache, runs the corpus, and uploads the
machine-specific results for 30 days. It never runs on pull requests.
