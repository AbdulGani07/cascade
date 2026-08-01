# Final launch audit

- Audit date: 2026-08-01 (Asia/Dhaka)
- Candidate: `3.3.1`
- Branch: `release/cascade-3.3.1`

## Decision

**GO as a reviewable release candidate; NOT YET AUTHORIZED FOR PUBLICATION.** Local launch-critical
gates pass after the fixes recorded below. Publication still requires pull-request approval, hosted
Linux/macOS/platform checks, merge to `main`, and protected npm/Marketplace environment approvals.

## Version selection and live state

Official npm metadata reports `latest=3.3.0` and `next=3.3.1-next.0` for all 17 public packages;
`@cascade-code/cli` has only those two published versions. GitHub's API reports tags through `v3.1.1`
and published Releases through `v3.1.0`; neither `v3.3.0` nor `v3.3.1` exists. Official VSCE output
reports only Marketplace numeric `3.3.0`, with `Microsoft.VisualStudio.Code.PreRelease=true`;
Marketplace `3.3.1` is unoccupied. Stable `3.3.1` is therefore greater than every relevant npm
version under SemVer precedence and is the lowest coordinated unused stable target. The prompt's
known-state assumption that Marketplace `3.3.1` was occupied was not confirmed by the live API.

Changesets exited `next` mode through the official command and generated all public manifests and
changelogs at `3.3.1`. Root and private workspace baselines were then aligned to the documented stable
policy; runtime-reported CLI/plugin/SARIF versions were aligned as release metadata.

## Command evidence

Passed:

- repository inventory, `git diff --check`, live npm queries, GitHub REST tag/Release queries, and
  `vsce show ... --json`;
- repository-pinned pnpm 9.15.0 frozen install with `--ignore-scripts`;
- `pnpm audit --prod --audit-level high` (no known vulnerabilities);
- `pnpm run format`;
- `pnpm run check`: lint, 20 workspace builds/typechecks, 43 test files / 155 tests, docs validation;
- explicit `pnpm run test:docs`, demo setup/verification, graph regression benchmark, and normal
  eight-repository real-world benchmark;
- version-state validation, release manifest validation, 17-package pack/clean-install validation;
- stable VS Code candidate preconditions, candidate dependency packaging, all-target dry run, package
  validation, and 70 MiB installed-size enforcement;
- Windows x64 disposable install/discovery and trace-confirmed activation;
- package smoke analysis/dashboard/editor-service lifecycle using a Unicode/space/parentheses path;
- final formatting, docs validation, tests, and `git diff --check` (rerun after documents are finalized).

Observed failures, retained rather than hidden:

- Plain fallback pnpm 11.9.0 repeatedly attempted to replace the pnpm-9 workspace and timed out. The
  gate uses ignored local Corepack shims pinned to repository policy; source files were not changed.
- The first `release:pack` clean install was denied access to npm's user cache by the sandbox; the
  unchanged command passed with the required filesystem approval.
- The initial real-world run rejected `dotnet/samples` because its archive exceeded the intentional
  128 MiB compressed limit. It was replaced with pinned MIT-licensed Contoso University, its baseline
  was explicitly authored once, and normal validation then passed.
- The first stable VSIX dry run could not fetch unpublished `@cascade-code/*@3.3.1` from npm. Candidate
  mode now packs the validated local packages with pnpm, installs all 17 tarballs with lifecycle
  scripts disabled, restores a portable manifest, and rejects local-path leakage. Registry-backed
  publication validation remains unchanged and strict.
- A final `release:state` refresh reached npm and Git tag checks but GitHub's unauthenticated Releases
  endpoint returned HTTP 403 twice (including with an explicit User-Agent), consistent with a shared
  API rate limit. Earlier official API evidence in this audit succeeded; `release:validate` and
  `release:pack` were rerun independently and passed. Publication must refresh the API state again.

Non-failing warnings: Vite reports the approximately 501 kB minified dashboard chunk; VSCE recommends
further bundling at 419–425 files; Windows Git reports CRLF conversion/config-file permission warnings;
VS Code CLI emits a Node `url.parse()` deprecation warning. None was suppressed.

## Stable VSIX artifacts

| Artifact                                            | Compressed bytes | Installed bytes | Files | SHA-256                                                            |
| --------------------------------------------------- | ---------------: | --------------: | ----: | ------------------------------------------------------------------ |
| `cascade-code-intelligence-3.3.1-darwin-arm64.vsix` |        7,715,479 |      44,892,474 |   425 | `089b332f2f8232ca5d8d47684000a88e86f8159ebd0720f9dbb3e01e12ef77ec` |
| `cascade-code-intelligence-3.3.1-darwin-x64.vsix`   |        7,684,394 |      44,374,104 |   425 | `4d79878ea2fc1108503cacf090a86190e2b99a2d0352f003a7b2172c475f5f9b` |
| `cascade-code-intelligence-3.3.1-linux-arm64.vsix`  |        6,697,268 |      42,297,313 |   419 | `6ed80b5b25f3a56697f417a0ac54914091fc0109f67e1bb30e759cbec71df99b` |
| `cascade-code-intelligence-3.3.1-linux-x64.vsix`    |        8,044,925 |      45,520,239 |   425 | `3bbc2ab94ddd32eaad261d87ee58ddd6ec27264dcd9bf898b3c4bf9d79637e6a` |
| `cascade-code-intelligence-3.3.1-win32-arm64.vsix`  |        7,074,458 |      42,931,353 |   419 | `932474fdb40a2f1e5598084d04f2c00d91fc4c27547fea7d19e7157ce2ac17d3` |
| `cascade-code-intelligence-3.3.1-win32-x64.vsix`    |        8,689,868 |      45,836,951 |   425 | `95ee935455065ed6a24be1c1bca51af6a0478f86e654493cf50287cde9918bb8` |

All are stable packages (no prerelease flag) and remain below the 73,400,320-byte installed ceiling.
The largest contributors are TypeScript runtime/compiler files and target-specific Tree-sitter native
binaries; these are retained for advertised local/offline language analysis.

## npm package artifacts

Every tarball is version `3.3.1` and passed content plus clean-consumer validation.

| Package artifact                             |   Bytes | SHA-256                                                            |
| -------------------------------------------- | ------: | ------------------------------------------------------------------ |
| `cascade-code-cli-3.3.1.tgz`                 | 174,420 | `51ba3c4a32635f4dfe3edc5c0c2a0dbf6b25e4772f71031d3ab3dde0a80baf89` |
| `cascade-code-config-3.3.1.tgz`              |   5,861 | `1b817c1cc97b7ad04c4aa789e3656e4880c4d22e0c24809b0240a8f20c342521` |
| `cascade-code-core-3.3.1.tgz`                |  37,012 | `ce112b4c38acd3939f06cac04264e4753f7ab42b1fd73a45ae667d9f431ff288` |
| `cascade-code-editor-service-3.3.1.tgz`      |   9,242 | `30fa842274aad614eeaf8b2ed714f9b40f6599974bb841fb223f6eb489cfcf5a` |
| `cascade-code-language-c-3.3.1.tgz`          |   6,238 | `c5516629f71b82a2b7ece32c1e7c8c486cae7668cbc2f0485bc9db62d14ba1bf` |
| `cascade-code-language-cpp-3.3.1.tgz`        |   5,183 | `3b5441fb6ff158d99d679b776ce4a07a0afcc27c010995f9800510d0fa0a7d1d` |
| `cascade-code-language-csharp-3.3.1.tgz`     |   7,716 | `6b4f16e5fd4de00153a1a39b94f567abefcc08b274190562901d7174ef05bae4` |
| `cascade-code-language-expanded-3.3.1.tgz`   |   7,191 | `a4970ed3fc43a3e8f1098af2cb8048c948c354dd25c000961b1cf9c2928add6c` |
| `cascade-code-language-go-3.3.1.tgz`         |   8,125 | `a3be72fa02b28bb70f59dedbfb2e33e63378a5755ffea96822fd0889f5a7e7f7` |
| `cascade-code-language-java-3.3.1.tgz`       |   6,841 | `32787bdece82d5e6524a07bdea217463e2e02cf47f36e4c0d84407dbca23e261` |
| `cascade-code-language-javascript-3.3.1.tgz` |   6,284 | `ba7c5e351fca098a07a7eb8efe94575aebae268238be0cc030ac56384a2becc5` |
| `cascade-code-language-kotlin-3.3.1.tgz`     |   6,075 | `35cc79bd8c1cb78d9d7a4a43414e6d5a2cfcf5232e4cc64bf60fb17a218e8962` |
| `cascade-code-language-python-3.3.1.tgz`     |   7,147 | `0bd3349198e3c785ce8af71ebbb38228ba63c314fd2cc51180f902e1b4d859fc` |
| `cascade-code-language-rust-3.3.1.tgz`       |   7,876 | `35bb63feba9379fcfa6f149d792fa4d34e10d80a6a2d777d842a76d295e91c0d` |
| `cascade-code-language-typescript-3.3.1.tgz` |   4,475 | `1d36ef3bd1a3114864f789aa15ec7ba6cf4da84e723c9634a91ab6d01b817953` |
| `cascade-code-plugin-api-3.3.1.tgz`          |  11,268 | `475691c7337416e1b25639e494b433e17448c2c538ff93ffc738b377bb457ade` |
| `cascade-code-reporters-3.3.1.tgz`           |   4,263 | `acfd4831e9a5414356fecde96ea4ebb5e40f50a92117916a3b684cd67c23a26b` |

## Workflows and target inventory

- `ci.yml`: required repository checks and VSIX size validation.
- `security.yml`: static security/package/dependency checks.
- `real-world-validation.yml`: scheduled/manual pinned-corpus benchmark, not every pull request.
- `release-pr.yml`: Changesets release preparation.
- `publish.yml`: protected npm trusted publication/provenance and stable tag/Release creation.
- `publish-vscode.yml`: manual dry-run-by-default six-target Marketplace workflow with a final protected
  secret-bearing publish job.

Marketplace target inventory: `win32-x64`, `win32-arm64`, `linux-x64`, `linux-arm64`, `darwin-x64`,
and `darwin-arm64`, all numeric `3.3.1`, stable flag, local/offline runtime.

## Remaining risks and publication blockers

- Hosted checks have not yet run for this branch; local results are not a substitute for GitHub CI.
- Linux/macOS and ARM native execution require their hosted platforms; local validation is structural
  for those five non-host targets.
- npm `3.3.1`, `v3.3.1`, its GitHub Release, and Marketplace `3.3.1` deliberately do not exist yet.
  Publication workflows must create them in the documented npm-then-Marketplace order.
- Historical npm `3.3.0` lacks a trustworthy matching tag/Release. This is recorded as a warning and
  must not be guessed or allowed to weaken exact matching for `3.3.1`.
- Accepted product limitations are documented in the release notes, capability matrix, real-world
  report, VSIX audit, and security audit; none is a confirmed unresolved critical/high vulnerability.

The candidate becomes **READY FOR PUBLICATION** only after PR approval, required hosted checks, merge
to `main`, and owner verification of protected environments, exact artifacts, and live availability.
