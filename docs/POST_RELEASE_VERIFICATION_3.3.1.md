# Cascade 3.3.1 post-release verification

- Verification date: 2026-08-02 (Asia/Dhaka)
- Product version: `3.3.1`
- Release commit: `a9b534addca906c88050d09becdedb6c7f88bae4`
- Annotated tag: `v3.3.1`
- GitHub Release: <https://github.com/AbdulGani07/cascade/releases/tag/v3.3.1>
- Marketplace identity: `cascade-code.cascade-code-intelligence`

## Verification verdict

Cascade 3.3.1 is publicly available from npm and the Visual Studio Marketplace, and the Windows x64
Marketplace package passed public installation, activation, command-registration, analysis,
dashboard-generation, and editor-service smoke checks. Final release archival is **not complete**:
the GitHub Release has only GitHub's two source archives, and the six live/workflow VSIX files cannot
be attached under the requested policy because their SHA-256 values do not match the candidate hashes
recorded in `docs/FINAL_LAUNCH_AUDIT.md`. The files were not overwritten or attached.

## Source, review, tag, and Release

The public GitHub UI and local Git history independently show all three protected pull requests as
merged into `main`:

- [PR #10](https://github.com/AbdulGani07/cascade/pull/10), the seven-commit stable release, merged as
  `a9b534a` after 12 checks.
- [PR #11](https://github.com/AbdulGani07/cascade/pull/11), the absolute VSIX artifact-path fix,
  merged as `99416d0` after 12 checks.
- [PR #12](https://github.com/AbdulGani07/cascade/pull/12), the published-state dry-run fix, merged as
  `4373572` after 12 checks.

Local `main`, `origin/main`, and the initial verification checkout all resolved to
`43735725af2db9b34bd8ca754ff6493cefd43407`. `v3.3.1` remains an annotated tag and peels to the exact
release commit `a9b534addca906c88050d09becdedb6c7f88bae4`. The stable GitHub Release exists, is neither a draft
nor a prerelease, and its release notes render with the intended highlights, upgrade instructions,
security notes, limitations, and rollback guidance.

The tag is annotated but is not a cryptographically signed tag. GitHub shows a verified signature on
the tagged merge commit; these are distinct properties.

## Public npm verification

Registry metadata and the downloaded public `3.3.1` tarball for each of the 17 packages were checked:

`@cascade-code/cli`, `@cascade-code/config`, `@cascade-code/core`,
`@cascade-code/editor-service`, `@cascade-code/language-c`, `@cascade-code/language-cpp`,
`@cascade-code/language-csharp`, `@cascade-code/language-expanded`,
`@cascade-code/language-go`, `@cascade-code/language-java`,
`@cascade-code/language-javascript`, `@cascade-code/language-kotlin`,
`@cascade-code/language-python`, `@cascade-code/language-rust`,
`@cascade-code/language-typescript`, `@cascade-code/plugin-api`, and
`@cascade-code/reporters`.

All 17 report version `3.3.1`, `latest=3.3.1`, and `next=3.3.1-next.0`. Every downloaded tarball
contained `package.json`, a package-specific `README.md`, `LICENSE`, and `dist/`; every registry
record supplied integrity, signature, and provenance-attestation metadata.

The stable protected npm workflow was
[run 30713862547](https://github.com/AbdulGani07/cascade/actions/runs/30713862547) on release commit
`a9b534a`. Its checks, packing, attestation, and trusted publication steps completed; the run then
failed in repository-release creation. The tag and GitHub Release were subsequently created through
the protected owner sequence. No npm publication was repeated during this verification.

### Public npm consumer smoke

A clean consumer installation was performed with lifecycle scripts disabled in
`Public npm consumer (delta, Bengali)` under a path containing spaces, parentheses, Greek, and
Bengali characters. The public registry package reported CLI version `3.3.1`, analyzed a three-file
TypeScript fixture, resolved the one expected dependency edge, reported an empty cycle set, and
generated a dashboard dataset. The report contained repository-relative paths only and did not
contain the consumer's absolute root or a `file:///` URI.

The host `npm` shim was broken because its configured `npm-cli.js` was absent. That failure was
retained. The public package was therefore installed with pnpm in isolated, non-workspace mode and
then invoked directly from its installed public payload; this does not use a repository build or a
globally installed Cascade CLI.

## Public Marketplace verification

The public Marketplace listing reports:

- publisher `cascade-code`;
- extension ID `cascade-code.cascade-code-intelligence`;
- version `3.3.1`;
- public stable status, with no prerelease metadata;
- the expected README and installation command;
- a rendered 128-by-128 icon;
- a Version History view containing stable `3.3.1` and the earlier `3.3.0` entry.

Target-specific public asset requests succeeded for all six advertised targets and returned the
exact byte sizes of the publication-workflow artifacts:

- `win32-x64`
- `win32-arm64`
- `linux-x64`
- `linux-arm64`
- `darwin-x64`
- `darwin-arm64`

The Marketplace overview's visible **Works with** list and one version-query response showed only
five targets and omitted `linux-x64`, while the official target-specific `linux-x64` asset endpoint
returned HTTP 200 with the correct 8,043,891-byte VSIX. This is recorded as a Marketplace indexing/UI
inconsistency, not evidence that the Linux x64 package is absent.

### Marketplace installation and activation

VS Code 1.131.0 installed the public identifier, not a local VSIX, into a new profile rooted at
`Marketplace verification (beta, Bengali)` under a quoted path containing spaces, parentheses,
Greek, and Bengali characters. Signature verification succeeded, and
`code --list-extensions --show-versions` returned exactly:

```text
cascade-code.cascade-code-intelligence@3.3.1
```

An extension-host test then activated the public Windows x64 extension successfully and confirmed
all six registered commands:

- `cascade.analyzeCurrentFile`
- `cascade.showDependents`
- `cascade.showDependencyPath`
- `cascade.showAffectedTests`
- `cascade.openDashboard`
- `cascade.refreshWorkspace`

`cascade.refreshWorkspace` executed successfully. The installed extension's bundled CLI, with no
global Cascade CLI, independently passed dependency analysis, impact analysis, cycle reporting,
architecture-governance evaluation, affected-test selection, and dashboard dataset generation. The
affected-test smoke selected `tests/index.test.ts` with high-confidence dependency evidence after a
change to `src/value.ts`.

The first affected-test attempt failed visibly because Git's ownership protection rejected the
disposable repository. A repository-scoped `safe.directory` override was used; no global Git safety
setting was weakened. Two non-elevated VS Code extension-test launches also failed to start their
renderer in the execution sandbox. The identical public-profile activation check passed when VS Code
was allowed to launch its renderer normally.

The public extension's bundled editor service passed `initialize`, `workspace/add`,
`workspace/refresh`, `health`, and `shutdown`; all responses were received, stderr was empty, and no
absolute fixture path appeared in the response payload. Dashboard output was generated successfully
and contained no absolute repository or consumer path.

## Security and privacy observations

- No repository or consumer scripts were executed; package installation used `--ignore-scripts`.
- Analysis and dashboard outputs used relative paths and did not contain the absolute fixture roots.
- The installed Cascade extension and bundled Cascade packages contained no telemetry client,
  outbound HTTP call, `fetch`, Axios, WebSocket, or Application Insights implementation. Package
  metadata contained expected repository URLs only.
- The extension-host telemetry log was empty. VS Code itself contacted Microsoft Marketplace/CDN and
  the user's installed GitHub Copilot integration despite the disposable launch using
  `--disable-telemetry`; no request was attributable to Cascade, and no analyzed source content or
  fixture path appeared in the network log. This observation does not claim that VS Code or other
  installed built-in integrations are offline.
- Public workflow pages and logs inspected during verification showed masked authorization headers
  and no Marketplace or npm token value. This is evidence of no observed token leakage, not proof
  about secrets outside the inspected logs.

## Marketplace automation history

- [Run 30726069105](https://github.com/AbdulGani07/cascade/actions/runs/30726069105) built and
  downloaded all six artifacts, then failed because filtered pnpm execution resolved relative
  `release-vsix/...` paths from `packages/vscode-extension`. PR #11 changed publication to use
  workspace-absolute paths.
- [Run 30729902253](https://github.com/AbdulGani07/cascade/actions/runs/30729902253) used the absolute
  paths and reached the protected VSCE step, then failed PAT verification with `TF400813`. The token
  was not printed.
- PR #12 fixed a separate local dry-run defect: candidate mode incorrectly required the already
  published npm version and existing GitHub Release to be absent during the post-npm Marketplace
  stage.
- The owner completed stable Marketplace publication manually after the protected automation could
  not authenticate. Public installation and target-specific asset checks above independently confirm
  the resulting live state.

## VSIX hashes, sizes, and GitHub Release assets

The six files recovered from Marketplace workflow run 30729902253 match the byte lengths served by
the six public Marketplace target endpoints:

| Target         | Compressed bytes | SHA-256                                                            |
| -------------- | ---------------: | ------------------------------------------------------------------ |
| `darwin-arm64` |        7,714,447 | `2fa95d1799b8c9ff95e76d4d5898f99867eac11d0181fc1eb10e0d3351a4f01c` |
| `darwin-x64`   |        7,683,360 | `d4a59232b80364782d3c9f7e1712d730dae3cfdab0b1140205f1ca53a65e1e68` |
| `linux-arm64`  |        6,696,234 | `e815ad2eb203a5af3189298faebd2488f192da98b68406bd159d8ae1abdf1f13` |
| `linux-x64`    |        8,043,891 | `3342bd310297a356611d3ff677a508e71d884ac2e0b2dca45759f30ce902a3dd` |
| `win32-arm64`  |        7,073,419 | `d8eb55af2a29f6ba68967938b0c3f48c16fa935a7091111dc5cb485053e386f3` |
| `win32-x64`    |        8,688,829 | `b78a3dfc2c404e477d7568ae2561da0b935e5c25f7b5f543fd2e6a15e955f34e` |

Each file has the expected filename, stable `3.3.1` identity, and target platform. These hashes do
not match the earlier candidate hashes in `docs/FINAL_LAUNCH_AUDIT.md`; the compressed sizes differ by
1,019 to 1,039 bytes. No file with the candidate hashes was found in the retained workspace
artifacts. The GitHub Release currently exposes only its two automatic source archives. In accordance
with the explicit no-overwrite and exact-hash requirements, no VSIX was attached. Maintainers must
reconcile which immutable artifact set is authoritative before attaching release assets.

## Known non-blocking limitations

- Only Windows x64 runtime activation was exercised locally. The other five public platform packages
  were verified structurally and through public target-specific downloads, not executed on their
  native operating systems in this verification.
- The Marketplace target index currently omits Linux x64 even though its public target asset is live.
- VS Code CLI emits a Node `url.parse()` deprecation warning during installation.
- The dashboard bundle and retained local parser/compiler runtimes remain the documented principal
  size contributors.
- Static dependency intelligence does not execute compilers, package managers, build scripts, or
  repository code and therefore retains the capability limitations in the release notes and
  capability matrix.

Historical `3.3.0` note: npm stable `3.3.0` had no confirmed matching remote tag or GitHub Release in
the launch audit, and Marketplace `3.3.0` was the prior prerelease. Do not backfill or move historical
references without trustworthy source-commit evidence.

## Rollback guidance

Published npm and Marketplace versions are immutable and must not be overwritten or reused. For a
confirmed regression, stop pending deployments, deprecate the affected npm packages with an explicit
message, mark the Marketplace version unavailable or deprecated through the owner interface when
supported, annotate the GitHub Release, and publish a new coordinated patch through the protected
workflow. Never move `v3.3.1`, use `--skip-duplicate`, or overwrite a different Release asset.
