# Current status engineering audit

> Historical snapshot: this audit records the prerelease state before the 3.3.1 stable-candidate
> transition. See `docs/FINAL_LAUNCH_AUDIT.md` for the current release decision and evidence.

Audit date: 2026-08-01 (Asia/Dhaka)

## Executive summary

Cascade has the declared 20-workspace shape: 17 public `@cascade-code/*` packages and three private workspaces. The public packages are consistently versioned at `3.3.1-next.0`; release manifest validation and the 17-package tarball/consumer smoke test passed. The build, 125-test Vitest suite, documentation validator, reproducible demo, and graph regression benchmark also passed.

This audit cannot classify the requested sequence as fully green. The first lint invocation failed before ESLint started because pnpm attempted a non-interactive modules-directory purge without `CI=true`. The first typecheck attempt timed out during that purge; after it had partially removed `node_modules`, the ordered typecheck invocation failed with missing `tsc` executables and Node type definitions. After restoring the frozen dependency tree, diagnostic reruns of both lint and typecheck passed. These are recorded as ordered-command failures, not hidden as successes.

No product implementation files were changed by this audit. The repository was already dirty in VS Code packaging and launch-documentation files; those changes were treated as user-owned. The main release concern is coordination rather than npm tarball integrity: root and two private workspaces remain `3.3.0`, public npm packages are `3.3.1-next.0`, and the private extension is numeric `3.3.1`. That split is intentional for the documented prerelease channels but must not be represented as one repository-wide version.

## Commands executed

The required commands were started in the requested order. `CI=true` was added after the lint preflight failure so subsequent scripts could run non-interactively. Repair installs and post-sequence diagnostic reruns are shown separately.

|   # | Command                          | Result                            | Evidence                                                                                                                                                                                                                                    |
| --: | -------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|   1 | `pnpm install --frozen-lockfile` | PASS after retry                  | Initial sandboxed attempt timed out at 120.6 s on registry `EACCES`/`ETIMEDOUT`; approved retry completed in 7.8 s with lockfile unchanged and 563 packages available.                                                                      |
|   2 | `pnpm run lint`                  | FAIL                              | Exit 1 before ESLint ran: `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`; pnpm's dependency-status preflight tried to remove `node_modules` without a TTY.                                                                                    |
|   3 | `pnpm run build`                 | PASS                              | Exit 0 in 52.5 s; all 20 package builds ran, including dashboard asset bundling into CLI.                                                                                                                                                   |
|   4 | `pnpm run typecheck`             | FAIL                              | A first attempt timed out at 300.5 s while recreating `node_modules`. The ordered retry exited 1: many workspaces reported `'tsc' is not recognized`; core, dashboard, and language-javascript also reported TS2688 for missing Node types. |
|   5 | `pnpm run test`                  | PASS after dependency-tree repair | Exit 0 in 15.6 s; 39 test files and 125 tests passed. A sandboxed start stalled and was terminated before Vitest output, then dependencies were restored and the command completed.                                                         |
|   6 | `pnpm run test:docs`             | PASS                              | Exit 0 in 3.4 s; links, headings, JSON, CLI commands, schema keys, and spelling validated.                                                                                                                                                  |
|   7 | `pnpm run demo:setup`            | PASS                              | Exit 0 in 3.1 s; created `.cascade-demo` and refs `demo-base`, `pr/new-cycle`, and `pr/remove-dead-code`.                                                                                                                                   |
|   8 | `pnpm run demo:verify`           | PASS                              | Exit 0 in 20.1 s; findings, PR scenarios, portable reports, and dashboard dataset verified.                                                                                                                                                 |
|   9 | `pnpm run benchmark:regression`  | PASS                              | Exit 0 in 3.0 s; 20,000 nodes, fanout 8, one cycle, 71.612 ms against a 2,500 ms threshold.                                                                                                                                                 |
|  10 | `pnpm run release:validate`      | PASS                              | Exit 0 in 2.1 s; validated 20 manifests and three private workspaces.                                                                                                                                                                       |
|  11 | `pnpm run release:pack`          | PASS                              | Exit 0 in 38.4 s; packed 17 tarballs, installed 66 packages in a temporary consumer, ran `npm ls`, CLI help/version/analyze/dashboard smoke checks, and validated all manifests.                                                            |

Auxiliary commands:

- `pnpm install --frozen-lockfile` was run twice more to restore `node_modules` after timed-out pnpm preflights; both passed without changing the lockfile.
- Post-sequence `CI=true; pnpm run lint` passed (exit 0, 11.5 s).
- Post-sequence `CI=true; pnpm run typecheck` passed for all 20 workspaces (exit 0, 52.4 s).
- `pnpm view @cascade-code/cli dist-tags version time --json` passed and verified the live npm tags below.
- Read-only PowerShell/`rg` inventory and Git-status commands were used to inspect the requested files, test inventory, version references, and pre-existing changes.

## Workspace inventory

`pnpm-workspace.yaml` includes `packages/*`. There are exactly 20 direct package workspaces (21 projects when the private root is included).

| Workspace             | Package                             | Version        | Visibility           |
| --------------------- | ----------------------------------- | -------------- | -------------------- |
| `cli`                 | `@cascade-code/cli`                 | `3.3.1-next.0` | Public               |
| `config`              | `@cascade-code/config`              | `3.3.1-next.0` | Public               |
| `core`                | `@cascade-code/core`                | `3.3.1-next.0` | Public               |
| `dashboard`           | `@cascade-code/dashboard`           | `3.3.0`        | Private              |
| `editor-service`      | `@cascade-code/editor-service`      | `3.3.1-next.0` | Public               |
| `language-c`          | `@cascade-code/language-c`          | `3.3.1-next.0` | Public               |
| `language-cpp`        | `@cascade-code/language-cpp`        | `3.3.1-next.0` | Public               |
| `language-csharp`     | `@cascade-code/language-csharp`     | `3.3.1-next.0` | Public               |
| `language-expanded`   | `@cascade-code/language-expanded`   | `3.3.1-next.0` | Public               |
| `language-go`         | `@cascade-code/language-go`         | `3.3.1-next.0` | Public               |
| `language-java`       | `@cascade-code/language-java`       | `3.3.1-next.0` | Public               |
| `language-javascript` | `@cascade-code/language-javascript` | `3.3.1-next.0` | Public               |
| `language-kotlin`     | `@cascade-code/language-kotlin`     | `3.3.1-next.0` | Public               |
| `language-python`     | `@cascade-code/language-python`     | `3.3.1-next.0` | Public               |
| `language-rust`       | `@cascade-code/language-rust`       | `3.3.1-next.0` | Public               |
| `language-typescript` | `@cascade-code/language-typescript` | `3.3.1-next.0` | Public               |
| `plugin-api`          | `@cascade-code/plugin-api`          | `3.3.1-next.0` | Public               |
| `reporters`           | `@cascade-code/reporters`           | `3.3.1-next.0` | Public               |
| `test-utils`          | `@cascade-code/test-utils`          | `3.3.0`        | Private              |
| `vscode-extension`    | `cascade-code-intelligence`         | `3.3.1`        | Private/npm-disabled |

## Public/private package inventory

The 17 public packages are the CLI, config, core, editor service, 11 language packages (`c`, `cpp`, `csharp`, `expanded`, `go`, `java`, `javascript`, `kotlin`, `python`, `rust`, `typescript`), plugin API, and reporters. Each declares MIT, the expected repository directory, Node `>=22.13.0`, `files` containing `dist`, an entry point, types, exports, public npm access, and provenance. Internal package dependencies use `workspace:^` in source manifests.

The three private workspaces are dashboard, test-utils, and `cascade-code-intelligence`. They have no `publishConfig`; Changesets is configured not to version or tag private packages and explicitly ignores all three.

## Current version and distribution-tag state

| Surface                      | Observed state                                                                                 | Assessment                                                                                                                                                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Root manifest                | `3.3.0`                                                                                        | Does not match public prerelease; root is private and is not Changesets-managed.                                                                                                                                   |
| 17 public npm manifests      | All `3.3.1-next.0`                                                                             | Lockstep and consistent with active prerelease metadata.                                                                                                                                                           |
| Private dashboard            | `3.3.0`                                                                                        | Intentionally not versioned by Changesets, but differs from public packages.                                                                                                                                       |
| Private test-utils           | `3.3.0`                                                                                        | Intentionally not versioned by Changesets, but differs from public packages.                                                                                                                                       |
| Private VS Code extension    | `3.3.1`                                                                                        | Numeric SemVer is required by Marketplace packaging and intentionally differs from npm prerelease SemVer.                                                                                                          |
| Changesets prerelease        | Mode `pre`, tag `next`; initial versions all `3.3.0`; applied changeset `aligned-parsers-next` | Consistent with the public transition to `3.3.1-next.0`. Private initial versions are historical metadata and those packages are ignored.                                                                          |
| Live npm `@cascade-code/cli` | `latest=3.3.0`, `next=3.3.1-next.0`; default `version=3.3.0`                                   | Matches repository launch documentation as queried on 2026-08-01. Only the CLI tag was queried; lockstep publication of every public package was not independently queried.                                        |
| Documented Marketplace state | Public prerelease `3.3.0`; prepared prerelease `3.3.1`                                         | Extension manifest matches the expected next Marketplace upload (`3.3.1 --pre-release`). Live Marketplace state was not independently confirmed by an authenticated/authoritative Marketplace query in this audit. |

The expected Marketplace version is therefore `3.3.1` as a prerelease, not `3.3.1-next.0`. A later stable extension must be greater than `3.3.1`; versions `3.3.0` and `3.3.1` cannot be reused.

## npm packaging risks

- The tarball validator is strong for allowlisting, forbidden paths, installability, CLI version, a Unicode/space-containing consumer path, path leakage, basic analysis, and dashboard assets. It passed.
- The smoke install uses `--ignore-scripts`. This reduces supply-chain exposure during validation but does not prove installation behavior that depends on lifecycle scripts or native-module preparation on all supported OS/CPU combinations. Tree-sitter native packages make cross-platform clean-install evidence important.
- Only `@cascade-code/cli` live dist-tags were queried. The release tooling assumes all 17 packages were published lockstep; a preflight should verify `latest` and `next` for every package.
- `.changeset/config.json` has global `access: restricted`, while public manifests specify `publishConfig.access: public`. Current validation checks the manifests, but the opposing default is a maintenance trap if a new public package omits `publishConfig`.
- The release workflow checks an existing Git tag and creates a GitHub release only for `latest`; prerelease publication remains dependent on correct manual tag selection and protected-environment controls.

## VS Code extension packaging risks

- Neither `package:validate` nor `package:prerelease` was part of the requested command list, so this audit did not prove current VSIX creation. The npm release pack test does not cover VSIX contents.
- Packaging resolves the two public workspace dependencies to registry versions in a staged manifest and runs `npm install`. This correctly tests distribution availability but makes packaging dependent on both matching packages already existing on npm under the exact prerelease version.
- The script validates required runtime files and rejects source, maps, fixtures, credentials, local paths, SVGs, tarballs, and VSIX files. It scans non-dependency files up to 2 MB; dependency content and larger first-party files do not receive content-pattern scanning.
- The extension bundles the CLI and editor service plus their transitive native tree-sitter dependencies. VSIX size, platform compatibility, and clean installation should be checked on Windows, macOS, and Linux; no such matrix is present in the reviewed workflows.
- Marketplace publishing is documented as a manual owner action. There is no reviewed Marketplace publication workflow or independently verified live `3.3.1` listing in this audit.

## Test coverage gaps

- The repository has unit, integration, and one CLI end-to-end test file, and the run passed 125 tests. There is no coverage command, coverage report, or enforced line/branch/function threshold, so source coverage cannot be quantified.
- The root lint glob covers `packages/*/src/**/*.ts`; it does not lint tests, scripts, benchmarks, examples, JavaScript/MJS, or React TSX files.
- CI validates Node 22 and 24 on Ubuntu. There is no Windows/macOS CI matrix despite platform-sensitive paths, native tree-sitter modules, VSIX assembly, and Windows-specific code.
- Dashboard component/contract/model tests exist, but the roadmap still calls out large-graph aggregation and virtualization; browser rendering and interaction performance are not exercised by the regression benchmark.
- The VS Code tests are source-level/unit packaging checks; no Extension Host smoke test or install-and-activate test of the produced VSIX was observed.
- The roadmap explicitly calls for more polyglot/adversarial fixtures, incremental-analysis/cache invalidation coverage, and plugin trust-boundary work.
- The affected-test feature is exercised through Git-impact/demo scenarios, but there is no evidence here of comparison against real coverage-provider data across multiple ecosystems.

## Documentation gaps

- `test:docs` passed, and the capability matrix accurately labels dynamic/generated/compiler limitations. However, version facts are repeated across installation, extension, release, and launch documents, increasing drift risk.
- The root README example pins the local GitHub Action at `v3.3.0`, while package docs describe the npm beta as `3.3.1-next.0`; the channel distinction should be explicit at the example.
- The launch guide states the Marketplace public/prerelease state, but that mutable external fact is not machine-verified by repository checks.
- Capability claims use broad labels such as “Structured”; the matrix warns that depth varies, but per-language fixture counts and accuracy/known-failure cases are not published.
- No generated current-status or release-state page reconciles root, npm, Changesets, and Marketplace versions; this audit supplies a snapshot, not automation.

## Security risks

- Third-party plugins execute in-process with the user's filesystem and process privileges; the security documentation explicitly says plugins are not sandboxed. This is the largest architectural trust-boundary risk.
- Static analysis does not replace a vulnerability scanner, compiler, runtime tracing, or data-flow security engine. Users can over-trust incomplete graphs when dynamic imports, generators, macros, build conditions, or runtime configuration are involved.
- The local dashboard has defensive headers/token/cookie controls but is documented as unsuitable for network exposure; accidental proxying would require a separate auth/TLS/data-retention design.
- GitHub Actions are pinned to commits and use limited permissions. Security workflows cover production dependency audit, dependency review, gitleaks, and CodeQL, but those commands were not included in this local audit and their current remote status was not verified.
- Release packaging scans for several secret formats and local paths, but heuristic scanning is incomplete and tarball dependency content is not scanned by the project validator.
- Native parser dependencies increase binary supply-chain and platform risk. The release smoke path uses `--ignore-scripts`, and no cross-platform artifact verification was observed.

## Performance risks

- The regression benchmark passed with large headroom (71.612 ms versus 2,500 ms), but it measures a synthetic stable graph operation, not full repository discovery, parsing, resolution, Git diffing, dashboard rendering, or extension refresh latency.
- A single local sample is not a distribution and provides no memory, p95/p99, cold/warm cache, or OS variance evidence.
- The performance documentation describes cache invalidation as incomplete, and the roadmap calls for stronger incremental analysis and very-large-dashboard virtualization.
- CI runs the stable graph threshold only on Node 22/Ubuntu. Node 24 and other operating systems do not gate performance.
- Configurable file/edge/depth bounds reduce denial-of-service risk but can yield incomplete analysis on very large repositories; product output must keep those truncations explicit.

## Launch blockers

### P0

- None demonstrated by the successfully executed build, test, demo, benchmark, and npm pack smoke checks. This does not certify remote security workflows or Marketplace state.

### P1

- Obtain authoritative owner-side confirmation that the reviewed `3.3.1` VSIX is packaged with prerelease metadata, has the expected hash/content manifest, and is uploaded only as Marketplace prerelease. The repository currently documents prepared versus public state but this audit did not verify the live service.
- Run `package:validate` and `package:prerelease`, inspect the resulting VSIX, and test clean installation/activation on supported Windows, macOS, and Linux environments before Marketplace launch.
- Verify live `latest`/`next` tags and provenance for all 17 public npm packages, not only the CLI, before declaring the npm prerelease coordinated.
- Require green remote CI and security workflows for the exact launch commit. Local commands do not establish branch-protection, CodeQL, dependency-audit, or secret-scan status.

### P2

- Make non-interactive pnpm behavior deterministic in the audit/developer runner. The initial ordered lint and typecheck checks failed because pnpm's preflight purged/recreated `node_modules`; although clean diagnostic reruns passed, this creates misleading and destructive local verification behavior.
- Add cross-platform CI for path handling, native parsers, release tarballs, and VSIX installation.
- Add measurable code coverage and expand end-to-end coverage for VS Code activation, dashboard browser behavior, architecture policies, and affected-test evidence.
- Strengthen plugin isolation and provenance controls, consistent with the roadmap.

### P3

- Consolidate mutable version/channel facts into generated documentation or an automated release-state verifier.
- Expand adversarial/polyglot fixtures and publish clearer per-capability evidence.
- Broaden lint coverage to tests, scripts, examples, MJS, and TSX where appropriate.
- Extend performance gates to full-analysis, memory, cache invalidation, and dashboard workloads where runner variance permits.

## Prioritized completion plan

1. Validate and create the exact `3.3.1` prerelease VSIX; inspect its generated manifest/hash and run clean Extension Host installation/activation tests on all supported operating systems.
2. Add a release-state preflight that queries all 17 npm packages, validates both dist-tags and provenance, reconciles Changesets mode, and records Marketplace state through an authoritative owner-accessible API or checklist.
3. Confirm CI/security workflow success for the exact release commit and preserve the evidence with the release artifacts.
4. Fix the local non-interactive pnpm preflight behavior so the documented command sequence runs reliably without purging a valid dependency tree; then rerun the complete sequence from a clean clone.
5. Add Windows/macOS CI and native-parser/VSIX smoke coverage.
6. Add coverage reporting and targeted end-to-end tests for affected-test selection, architecture-rule enforcement, editor refresh, and dashboard rendering.
7. Implement roadmap hardening in order: cache invalidation correctness, plugin trust boundaries, large-graph dashboard behavior, and versioned schemas.
