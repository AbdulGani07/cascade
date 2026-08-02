# Cascade 3.3.1 release checklist

Evidence dates: 2026-08-01 candidate audit and 2026-08-02 public post-release verification. Checked
items below are backed by the cited local, registry, Marketplace, GitHub, or hosted-workflow evidence.

## Version and packages

- [x] All 17 public `@cascade-code/*` manifests are `3.3.1`.
- [x] Root, dashboard, test-utils, and VS Code extension follow the stable `3.3.1` policy.
- [x] Changesets prerelease mode was exited with `pnpm changeset pre exit`; `.changeset/pre.json` is absent.
- [x] Public changelogs contain a `3.3.1` entry and internal packed ranges resolve to `3.3.1`.
- [x] Every npm tarball contains `package.json`, package-specific `README.md`, a license, and `dist/`.
- [x] A clean consumer installed all 17 tarballs together, passed `npm ls --all`, ran CLI help,
      analyzed a fixture, and generated a dashboard without lifecycle scripts.
- [x] CLI execution through the installed tarball was exercised (equivalent to the package payload
      used by `npx`; registry `npx @3.3.1` remains impossible before publication).

## Product surfaces

- [x] CLI analysis passed on the test and package-smoke fixtures.
- [x] Dashboard generation and portable report checks passed.
- [x] Editor-service initialize, workspace add/refresh, health, and shutdown passed.
- [x] GitHub Action manifests, action pins, permissions, inputs, and release workflows passed tests and
      documentation validation.
- [x] Six stable target-specific VSIX files were generated and validated structurally.
- [x] Windows x64 VSIX installed in a disposable VS Code 1.131.0 profile and was discovered as
      `cascade-code.cascade-code-intelligence@3.3.1`.
- [x] VS Code trace recorded activation via `workspaceContains:cascade.config.json`.
- [x] CLI/VSIX smoke fixtures include spaces, parentheses, and Unicode.
- [x] Dashboard, report, package, and VSIX validators found no absolute local path leakage.

## Platform and assurance

- [x] Windows x64 native runtime execution was exercised locally.
- [ ] Linux x64/ARM64 runtime execution: requires hosted CI on the pushed commit; package structure passed.
- [ ] macOS x64/ARM64 runtime execution: requires hosted CI on the pushed commit; package structure passed.
- [x] ARM64 packages contain only their target native binaries and pass structural/package validation.
- [x] Security audit and regression tests report no unresolved confirmed critical or high finding.
- [x] `pnpm audit --prod --audit-level high` reported no known vulnerabilities.
- [x] All package READMEs and licenses passed tarball validation.
- [x] Stable source/channel validation and live candidate availability checks passed.

## Publication prerequisites

- [x] Release PR #10 was approved, passed 12 hosted checks, and merged.
- [x] Exact release commit `a9b534addca906c88050d09becdedb6c7f88bae4` merged to `main`
      without rewriting history.
- [x] The protected npm workflow published all 17 packages at `latest` with registry provenance
      metadata. Its later repository-release step failed and was not hidden.
- [x] All 17 public npm packages report `latest=3.3.1` and `next=3.3.1-next.0`.
- [x] `v3.3.1` is an annotated tag peeling to the exact release commit, and the stable GitHub Release
      exists with rendered release notes.
- [x] Workflow-fix PR #11 and dry-run-state PR #12 were approved, passed 12 hosted checks each, and
      merged to `main`.
- [x] Six target-specific stable `3.3.1` packages are publicly downloadable from Marketplace target
      endpoints, including Linux x64.
- [x] The public Windows x64 Marketplace package installed into a clean profile, activated, registered
      all six commands, analyzed the Unicode-path fixture, generated dashboard data, and ran the
      editor-service lifecycle without a global Cascade CLI.
- [ ] Attach the six VSIX files to the GitHub Release. The retained workflow/public artifacts do not
      match the candidate SHA-256 values in `docs/FINAL_LAUNCH_AUDIT.md`; no mismatched asset was
      attached or overwritten.
- [ ] Reconcile the Marketplace target index, whose visible list omits Linux x64 while the official
      Linux x64 target asset endpoint returns the expected public VSIX.
- [ ] Complete final post-release archival after resolving the VSIX hash mismatch. See
      `docs/POST_RELEASE_VERIFICATION_3.3.1.md`.

Historical note: npm stable `3.3.0` has no confirmed matching remote tag or GitHub Release. Do not
backfill it without trustworthy evidence identifying the exact published source commit.
