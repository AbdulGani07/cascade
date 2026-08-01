# Cascade 3.3.1 release checklist

Evidence date: 2026-08-01. This checklist prepares artifacts; it does not authorize publication.

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

- [ ] Pull request approved and required hosted checks green.
- [ ] Exact release commit merged to `main` without rewriting history.
- [ ] npm protected environment approved; publish all 17 packages at `latest` with provenance.
- [ ] Confirm all npm `latest` tags equal `3.3.1` before Marketplace publication.
- [ ] Protected workflow creates exact `v3.3.1` tag and GitHub Release from the merged commit.
- [ ] Marketplace protected environment approved; publish six reviewed VSIX files as stable.
- [ ] Verify post-publication npm, GitHub, and Marketplace state and retain provenance/artifact evidence.

Historical note: npm stable `3.3.0` has no confirmed matching remote tag or GitHub Release. Do not
backfill it without trustworthy evidence identifying the exact published source commit.
