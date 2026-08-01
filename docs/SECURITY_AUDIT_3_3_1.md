# Security audit: 3.3.1 stable readiness

Date: 2026-08-01

## Scope and method

This review treats analyzed repositories as hostile input. It inspected the CLI,
core scanner and resolvers, configuration loader, Git impact implementation,
report serialization, dashboard server, editor service, VS Code extension,
composite GitHub Action, workflows, package lifecycle configuration, real-world
archive benchmark, release packing, and production dependency tree.

The review used source inspection, focused hostile-input tests, the full test and
documentation suite, production dependency audit, npm tarball validation, VSIX
content/size validation, and extension packaging smoke checks. It is not a formal
proof, independent penetration test, or guarantee that no vulnerabilities remain.

## Data and execution flow

Normal analysis reads repository files and structured/text metadata locally. It
does not import repository JavaScript configuration, run package managers, invoke
build tools, or send source through an outbound network client. Git impact invokes
the locally installed Git executable because snapshots and diffs require Git
metadata. The invocation uses argument arrays, validates revisions, disables
repository hooks, and disables external diff and text-conversion drivers.

The editor service communicates over child-process stdin/stdout. The dashboard is
the only normal network listener and binds to `127.0.0.1` with a random token,
HTTP-only same-site cookie, no CORS opt-in, CSP, no-store caching, and request
timeouts. The scheduled real-repository benchmark explicitly downloads pinned
GitHub archives; it is not part of normal analysis or every-PR tests.

## Findings fixed

### High: Git worktree creation could execute repository hooks

Git worktree operations were invoked through `execFileSync`, preventing shell
injection, but Git itself could consult a hostile repository hook. Every Git
invocation now sets an empty `core.hooksPath`; diff operations also use
`--no-ext-diff` and `--no-textconv`. Regression coverage verifies these controls.

### High: untrusted VS Code workspace executable overrides

`cascade.servicePath` and `cascade.cliPath` are intentional advanced settings, but
workspace-scoped values could otherwise select an executable. The extension now
uses these overrides only when `vscode.workspace.isTrusted`. Its manifest declares
both as restricted configurations for untrusted workspaces. Bundled local
components remain the default.

### Medium: configuration symlink escape

The configuration loader checked the configured path lexically but did not
canonicalize an existing `cascade.config.json` before reading. It now resolves the
file, verifies the canonical target remains inside the canonical analysis root,
and requires a regular file. A hostile symlink regression test covers the case.

### Medium: plugin resolver path escape

A plugin could return an absolute or relative resolved path outside the root. The
graph builder now canonicalizes existing targets, applies the root boundary to all
resolver results, and converts an escape into an unresolved edge with an explicit
`SECURITY_PATH_ESCAPE` diagnostic. No outside path is placed in the graph.

### Medium: editor query symlink escape

Editor queries already rejected lexical `..` traversal. Existing query paths are
now canonicalized, cross-volume absolute results are rejected, and a symlink escape
has behavioral regression coverage.

### Medium: scheduled benchmark archive resource exhaustion

Archive extraction already rejected traversal, links, and special entries, but it
decompressed the entire response without explicit limits. Downloads are now
streamed with a 128 MiB compressed cap; gunzip output is capped at 512 MiB;
individual entries at 50 MiB; and file count at 100,000. These limits apply only
to the explicit benchmark corpus, not repository analysis.

### Medium: unnecessary VSIX development CLI surface

The Kotlin Tree-sitter grammar declares `npm-check-updates` transitively even
though its runtime binding does not use that development CLI. VSIX staging now
removes it and content validation fails if it returns. Parser bindings and their
required native runtimes remain packaged and are smoke-tested.

## Controls confirmed

- Child processes use argument arrays with `shell` disabled. Paths with spaces,
  Unicode, and parentheses remain single arguments.
- Repository discovery canonicalizes roots, rejects external symlinks when
  internal symlink support is enabled, and ignores symlinks by default.
- Default limits bound files, individual bytes, total bytes, editor graph size,
  traversal depth, request size, and dashboard rendering.
- Configuration rejects prototype-sensitive keys recursively and validates known
  top-level keys and numeric ranges.
- Portable JSON serialization relativizes project paths and redacts common secret
  formats. Browser validation provides additional absolute-path redaction.
- Dashboard repository strings render through React text, not unsafe HTML APIs.
- The editor service has no TCP listener and limits protocol lines to 1 MiB.
- GitHub workflows use minimal declared permissions and immutable action pins.
- Public packages define no install/postinstall lifecycle scripts. Security CI
  installs with `--ignore-scripts` before auditing production dependencies.
- Normal analyzer/editor/extension code has no outbound source-upload or telemetry
  client. The dashboard only fetches its same-origin `/api/analysis` endpoint.

## Accepted risks and trust assumptions

- Third-party Cascade plugins execute with the host process permissions and are
  not sandboxed. Only reviewed, pinned plugins should be installed.
- Native parser binaries, Node.js, Git, VS Code, installed dependencies, and the
  operating system are part of the trusted computing base.
- Static parsing can still encounter a previously unknown parser vulnerability or
  pathological input before cancellation is observed.
- Redaction is defense in depth and cannot identify every proprietary identifier
  or novel secret. Reports require review before external sharing.
- A hostile process running as the same OS user can interfere with local files and
  loopback services. The dashboard token is not an OS-level isolation boundary.
- High user-configured resource limits can allow substantial memory/CPU use.
- Filesystem checks cannot eliminate every time-of-check/time-of-use race against
  a concurrent same-user process.

## False positives closed

- Child-process presence is not itself command injection: production invocations
  use executable/argument arrays and do not enable a shell.
- The editor service does not need network authentication because it has no network
  listener; the parent process pipe is its boundary.
- The dashboard does not enable CORS. A cross-origin page cannot read analysis data,
  and the random token is exchanged for an HTTP-only cookie on loopback.
- Archive traversal and link extraction were already rejected; the confirmed gap
  was resource bounding, not path traversal.
- Package manifests contain no install/postinstall lifecycle execution surface.

## Remaining work

- Add independent dynamic security testing on Linux, Windows, and macOS release
  artifacts.
- Add fuzzing for manifest parsers, import extractors, JSON migration, and archive
  headers with memory/time budgets.
- Evaluate worker/process isolation and per-plugin time/memory limits for third-party
  plugins before describing plugins as isolated.
- Keep production dependency and native-binary advisories under scheduled review.
- Consider signing/checksumming every platform VSIX and publishing an SBOM with the
  stable release artifacts.

## Classification

- Fixed critical: none confirmed.
- Fixed high: Git hook/external diff execution; untrusted-workspace executable overrides.
- Fixed medium: configuration symlink escape; resolver root escape; editor query
  symlink/cross-volume escape; benchmark archive resource exhaustion; unnecessary
  VSIX development CLI surface.
- Accepted risks: plugin trust, same-user local attacks, parser/native dependency
  vulnerabilities, redaction limits, configurable resource consumption, TOCTOU.
- False positives: shell injection in production paths, editor TCP authentication,
  dashboard CORS exposure, archive traversal, npm lifecycle scripts.
- Remaining work: cross-platform dynamic testing, fuzzing, plugin isolation, SBOM
  and artifact-signing improvements.
