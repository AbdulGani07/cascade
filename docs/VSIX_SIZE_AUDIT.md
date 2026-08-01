# VSIX size audit

Measured on 2026-08-01 from the documented `3.3.1` prerelease packaging flow on Windows x64.

## Executive summary

The baseline universal VSIX was 31.17 MiB compressed and 284.65 MiB unpacked across 1,396 files. The extension's own compiled code was only 19.85 KiB; 284.61 MB reported by VSCE was under `node_modules`. The dominant causes were generated Tree-sitter C sources, six-platform native prebuild sets, unused WASM parser copies, TypeScript declaration libraries, and repeated Tree-sitter runtimes.

The implemented design produces target-specific, fully offline VSIX files. It retains every Cascade language plugin and the native prebuild for the selected OS/architecture, while removing parser build sources, WASM alternatives, declarations, maps, tests, examples, package READMEs, and other non-runtime metadata from the staged dependency tree. The Windows x64 artifact is 8.75 MiB compressed and 44.94 MiB unpacked across 432 files, below the documented 70 MiB installed budget.

## Baseline measurements

| Metric                      |        Baseline universal VSIX |   Optimized Windows x64 VSIX |
| --------------------------- | -----------------------------: | ---------------------------: |
| Compressed size             |   32,686,897 bytes (31.17 MiB) |   9,172,585 bytes (8.75 MiB) |
| Uncompressed installed size | 298,480,594 bytes (284.65 MiB) | 47,123,385 bytes (44.94 MiB) |
| Files                       |                          1,396 |                          432 |
| Native/WASM binaries        |   101 files, 149,588,995 bytes |   17 files, 23,338,496 bytes |
| Generated `parser.c` files  |    18 files, 111,814,846 bytes |                            0 |

“Installed size” is the sum of uncompressed non-directory ZIP entries. VSCE's displayed `node_modules` size was 284.61 MB for the baseline and 44.90 MB after optimization.

## Largest baseline dependency directories

| Dependency                                 |      Bytes | Files |
| ------------------------------------------ | ---------: | ----: |
| `@cascade-code/language-csharp`            | 79,758,320 |   109 |
| `@cascade-code/language-typescript`        | 47,255,300 |   156 |
| `@tree-sitter-grammars/tree-sitter-kotlin` | 47,161,889 |    24 |
| `@cascade-code/language-cpp`               | 45,079,095 |   110 |
| `typescript`                               | 23,625,066 |   132 |
| `tree-sitter-rust`                         | 15,049,205 |    27 |
| `tree-sitter-c`                            |  8,967,502 |    25 |
| `@cascade-code/language-java`              |  8,917,098 |   108 |
| `@cascade-code/language-javascript`        |  8,417,438 |   115 |
| `@cascade-code/language-go`                |  6,406,711 |   109 |
| `tree-sitter`                              |  4,305,148 |    80 |
| `npm-check-updates`                        |  1,341,356 |    11 |

The archive contained seven copies of `tree-sitter` and two copies of `tree-sitter-javascript`, arising from incompatible/transitive dependency placement. Target pruning reduces their payload, but does not force unsafe version unification.

## Largest 50 baseline files

|   MiB | Entry                                                                                                                                             |
| ----: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 33.04 | `extension/node_modules/@cascade-code/language-csharp/node_modules/tree-sitter-c-sharp/src/parser.c`                                              |
| 21.40 | `extension/node_modules/@tree-sitter-grammars/tree-sitter-kotlin/src/parser.c`                                                                    |
| 16.50 | `extension/node_modules/@cascade-code/language-cpp/node_modules/tree-sitter-cpp/src/parser.c`                                                     |
|  8.69 | `extension/node_modules/typescript/lib/typescript.js`                                                                                             |
|  8.36 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-typescript/tsx/src/parser.c`                                   |
|  8.34 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-typescript/typescript/src/parser.c`                            |
|  6.16 | `extension/node_modules/tree-sitter-rust/src/parser.c`                                                                                            |
|  5.93 | `extension/node_modules/typescript/lib/_tsc.js`                                                                                                   |
|  5.81 | `extension/node_modules/@cascade-code/language-csharp/node_modules/tree-sitter-c-sharp/prebuilds/win32-x64/tree-sitter-c-sharp.node`              |
|  5.80 | `extension/node_modules/@cascade-code/language-csharp/node_modules/tree-sitter-c-sharp/prebuilds/win32-arm64/tree-sitter-c-sharp.node`            |
|  5.74 | `extension/node_modules/@cascade-code/language-csharp/node_modules/tree-sitter-c-sharp/prebuilds/darwin-arm64/tree-sitter-c-sharp.node`           |
|  5.67 | `extension/node_modules/@cascade-code/language-csharp/node_modules/tree-sitter-c-sharp/prebuilds/linux-x64/tree-sitter-c-sharp.node`              |
|  5.67 | `extension/node_modules/@cascade-code/language-csharp/node_modules/tree-sitter-c-sharp/prebuilds/linux-arm64/tree-sitter-c-sharp.node`            |
|  5.65 | `extension/node_modules/@cascade-code/language-csharp/node_modules/tree-sitter-c-sharp/prebuilds/darwin-x64/tree-sitter-c-sharp.node`             |
|  5.65 | `extension/node_modules/@cascade-code/language-csharp/node_modules/tree-sitter-c-sharp/tree-sitter-c_sharp.wasm`                                  |
|  3.69 | `extension/node_modules/tree-sitter-c/src/parser.c`                                                                                               |
|  3.42 | `extension/node_modules/@cascade-code/language-cpp/node_modules/tree-sitter-cpp/prebuilds/win32-x64/tree-sitter-cpp.node`                         |
|  3.42 | `extension/node_modules/@cascade-code/language-cpp/node_modules/tree-sitter-cpp/prebuilds/win32-arm64/tree-sitter-cpp.node`                       |
|  3.39 | `extension/node_modules/@tree-sitter-grammars/tree-sitter-kotlin/prebuilds/win32-arm64/@tree-sitter-grammars+tree-sitter-kotlin.node`             |
|  3.39 | `extension/node_modules/@tree-sitter-grammars/tree-sitter-kotlin/prebuilds/win32-x64/@tree-sitter-grammars+tree-sitter-kotlin.node`               |
|  3.37 | `extension/node_modules/@tree-sitter-grammars/tree-sitter-kotlin/prebuilds/darwin-arm64/@tree-sitter-grammars+tree-sitter-kotlin.node`            |
|  3.34 | `extension/node_modules/@cascade-code/language-cpp/node_modules/tree-sitter-cpp/prebuilds/darwin-arm64/tree-sitter-cpp.node`                      |
|  3.31 | `extension/node_modules/@tree-sitter-grammars/tree-sitter-kotlin/prebuilds/linux-arm64/@tree-sitter-grammars+tree-sitter-kotlin.node`             |
|  3.30 | `extension/node_modules/@tree-sitter-grammars/tree-sitter-kotlin/prebuilds/linux-x64/@tree-sitter-grammars+tree-sitter-kotlin.node`               |
|  3.29 | `extension/node_modules/@cascade-code/language-cpp/node_modules/tree-sitter-cpp/prebuilds/linux-x64/tree-sitter-cpp.node`                         |
|  3.29 | `extension/node_modules/@cascade-code/language-cpp/node_modules/tree-sitter-cpp/prebuilds/linux-arm64/tree-sitter-cpp.node`                       |
|  3.28 | `extension/node_modules/@tree-sitter-grammars/tree-sitter-kotlin/tree-sitter-kotlin.wasm`                                                         |
|  3.28 | `extension/node_modules/@tree-sitter-grammars/tree-sitter-kotlin/prebuilds/darwin-x64/@tree-sitter-grammars+tree-sitter-kotlin.node`              |
|  3.28 | `extension/node_modules/@cascade-code/language-cpp/node_modules/tree-sitter-cpp/tree-sitter-cpp.wasm`                                             |
|  3.27 | `extension/node_modules/@cascade-code/language-cpp/node_modules/tree-sitter-cpp/prebuilds/darwin-x64/tree-sitter-cpp.node`                        |
|  2.84 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-typescript/prebuilds/win32-x64/tree-sitter-typescript.node`    |
|  2.83 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-typescript/prebuilds/win32-arm64/tree-sitter-typescript.node`  |
|  2.79 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-typescript/prebuilds/darwin-arm64/tree-sitter-typescript.node` |
|  2.78 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-typescript/prebuilds/linux-arm64/tree-sitter-typescript.node`  |
|  2.78 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-typescript/prebuilds/linux-x64/tree-sitter-typescript.node`    |
|  2.76 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-typescript/prebuilds/darwin-x64/tree-sitter-typescript.node`   |
|  2.44 | `extension/node_modules/@cascade-code/language-java/node_modules/tree-sitter-java/src/parser.c`                                                   |
|  2.37 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-javascript/src/parser.c`                                       |
|  2.37 | `extension/node_modules/@cascade-code/language-javascript/node_modules/tree-sitter-javascript/src/parser.c`                                       |
|  1.79 | `extension/node_modules/typescript/lib/lib.dom.d.ts`                                                                                              |
|  1.47 | `extension/node_modules/@cascade-code/language-go/node_modules/tree-sitter-go/src/parser.c`                                                       |
|  1.38 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-typescript/tree-sitter-tsx.wasm`                               |
|  1.35 | `extension/node_modules/@cascade-code/language-typescript/node_modules/tree-sitter-typescript/tree-sitter-typescript.wasm`                        |
|  1.17 | `extension/node_modules/tree-sitter-rust/prebuilds/win32-x64/tree-sitter-rust.node`                                                               |
|  1.16 | `extension/node_modules/tree-sitter-rust/prebuilds/win32-arm64/tree-sitter-rust.node`                                                             |
|  1.12 | `extension/node_modules/tree-sitter-rust/prebuilds/darwin-arm64/tree-sitter-rust.node`                                                            |
|  1.10 | `extension/node_modules/tree-sitter-rust/prebuilds/linux-x64/tree-sitter-rust.node`                                                               |
|  1.10 | `extension/node_modules/tree-sitter-rust/prebuilds/linux-arm64/tree-sitter-rust.node`                                                             |
|  1.10 | `extension/node_modules/tree-sitter-rust/prebuilds/darwin-x64/tree-sitter-rust.node`                                                              |
|  1.06 | `extension/node_modules/npm-check-updates/build/index.js`                                                                                         |

## Design evaluation

- **Bundle extension/editor client:** rejected as the primary optimization. The three compiled extension files total only 19.85 KiB. Bundling them would not materially change installed size and could complicate `vscode` externalization and child-process resolution.
- **Keep child-process runtime external:** retained. The CLI dashboard assets and editor-service worker/server files remain ordinary files so spawning, worker URLs, and offline behavior are unchanged.
- **Deduplicate Cascade packages:** npm already installs one copy of each Cascade package. No material duplicate Cascade payload existed.
- **Prune non-runtime dependency content:** implemented. Package README files, declarations, maps, tests, examples, docs, generated parser sources, grammar definitions, query files, and unused WASM alternatives are removed only from the temporary staging tree.
- **Deduplicate Tree-sitter runtimes:** not forced. Seven copies reflect two runtime versions and nested native dependency constraints. Version overrides would carry more compatibility risk than their remaining target-specific size justifies.
- **Lazy/optional plugins:** rejected for now. Every advertised language remains installed and available offline.
- **Separate language packs:** unnecessary after target-specific pruning reached the preferred budget.
- **Post-install downloads:** rejected. Artifacts are complete, local-only, and require no network after installation.

## Packaging architecture and budget

`package.mjs` selects the current `platform-arch` by default and accepts `--target` for `win32-x64`, `win32-arm64`, `linux-x64`, `linux-arm64`, `darwin-x64`, and `darwin-arm64`. `package:all-targets` creates all six Marketplace-compatible variants. VSCE records the target in each manifest so Marketplace clients receive the appropriate artifact.

The installed-size budget is **70 MiB per target-specific VSIX**. This is the preferred target from the engineering request, leaves roughly 25 MiB of headroom over the measured Windows x64 artifact, and prevents a return to universal multi-platform payloads. `scripts/check-vsix-size.mjs` prints compressed/unpacked size, file count, and the 20 largest entries and exits nonzero above budget.

## Verification scope

Staged-package validation now runs the bundled CLI against a disposable path containing spaces, parentheses, and Unicode; verifies a resolved TypeScript edge; generates dashboard output; rejects absolute-path leakage; and starts, initializes, refreshes, queries, shuts down, and stops the bundled editor service. Existing controller tests validate all six contributed command registrations and command routing. CI packages and size-checks native artifacts on Windows, Linux, and macOS.

An actual VS Code installation smoke is performed when a local `code` CLI is available, but CI correctness does not depend on a preinstalled graphical editor. Activation behavior remains covered at the controller/manifest boundary; a fully interactive Extension Host UI suite remains future work.

## Remaining contributors and trade-offs

The largest retained files are TypeScript's runtime (`typescript.js` and `_tsc.js`), the selected platform's C#/C++/Kotlin/TypeScript parser binaries, and repeated compatible Tree-sitter runtime binaries. Removing these would reduce language or resolution capability. The trade-off is six release artifacts instead of one universal VSIX; Marketplace target selection is the supported distribution mechanism, and offline operation is preserved.
