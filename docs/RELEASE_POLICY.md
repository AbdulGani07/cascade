# Release policy

Cascade uses semantic versioning and Changesets for its 17 public npm packages. Public packages
currently move as one fixed version group because the CLI, analysis engine, language plugins,
reporters, configuration, editor service, and plugin API form one tested product surface.

## Authoritative version mapping

One product release has the following representation. This mapping is required by Marketplace,
which accepts numeric extension versions and records prerelease status separately from SemVer.

| Release state        | Public npm packages | npm tag  | Marketplace manifest | Marketplace flag |
| -------------------- | ------------------- | -------- | -------------------- | ---------------- |
| Prerelease example   | `X.Y.Z-next.N`      | `next`   | `X.Y.Z`              | prerelease       |
| Stable, version free | `X.Y.Z`             | `latest` | `X.Y.Z`              | stable           |
| Stable, version used | next free patch     | `latest` | same next free patch | stable           |

The 17 public packages always have one Changesets-controlled version. During prerelease mode its
base version is the prepared Marketplace numeric version and its prerelease identifier matches
`.changeset/pre.json`. Marketplace numeric versions are immutable across channels: if that numeric
version was actually uploaded as a prerelease, stable promotion advances npm and Marketplace to the
lowest unused patch. Stable npm and Marketplace versions must be identical. Registry and Marketplace
queries, rather than an assumed mapping, select the candidate.

The private root, dashboard, and test-utils versions record the last stable baseline. They are not
published and Changesets does not version them. During a prerelease they equal every public
package's `initialVersions` value; after stable promotion they equal the public stable version.
The private `cascade-code-intelligence` workspace is the exception: its numeric version is derived
from the public npm version by removing the prerelease suffix.

Run `pnpm run release:state` to display this mapping and compare npm dist-tags with remote Git tags
and GitHub Releases. It intentionally fails on a missing published counterpart. Run
`pnpm run vscode:version:prepare` after Changesets changes the public target; never edit the
extension version manually. `pnpm run release:validate-version-state` checks lockstep versions,
Changesets metadata, private policy, changelogs, and Marketplace mapping. Stable and prerelease VSIX
commands enforce their respective source state, including when `package.mjs` is called directly.

## Version and compatibility policy

- **Patch**: compatible fixes, documentation corrections, performance work, and dependency updates.
- **Minor**: backward-compatible features, new optional fields, languages, commands, or plugin hooks.
- **Major**: removals or incompatible CLI, schema, configuration, package export, or plugin API changes.
- Node.js `>=22.13.0` is supported. Raising this floor is a breaking change and requires a major
  release unless the dropped Node line is already end-of-life and the release notes explicitly say so.
- JSON outputs carry a `schemaVersion`. Additive changes retain the schema major; removals, meaning
  changes, or newly required fields increment it. Readers must reject unknown major versions and
  ignore unknown fields within a known major. The current governance and Git-impact schema is `1.0`.
- `@cascade-code/plugin-api` follows the package major. Additive optional interfaces are minor; removing or
  changing required contracts is major. Third-party plugins should use a compatible peer range and
  test against the oldest and newest supported API release.

Every user-visible change needs a changeset. A breaking changeset must include migration guidance.
Changesets update package changelogs and the root release PR; GitHub-generated notes complement, but
do not replace, those migration notes.

## Package ownership and boundaries

The public packages are `@cascade-code/cli`, `@cascade-code/config`, `@cascade-code/core`,
`@cascade-code/editor-service`, every `@cascade-code/language-*` package, `@cascade-code/plugin-api`, and
`@cascade-code/reporters`. Internal runtime dependencies use `workspace:^` and become compatible npm
ranges when packed.

`@cascade-code/dashboard` is private and its built static assets are copied into `@cascade-code/cli/dist`.
It is never resolved through a repository-relative path after installation. `@cascade-code/test-utils`
is private development support. `cascade-code-intelligence` is private to npm and is distributed
only as a VSIX through the VS Code Marketplace workflow.

## Release checklist

1. Add and review changesets, including migrations and the correct SemVer level.
2. Merge to `main`; review and merge the generated `chore: release packages` pull request.
3. Confirm CI, security, `pnpm run release:validate`, and branch protection are green.
4. Confirm every package name under the owner-controlled `@cascade-code` scope is still available.
5. Run `pnpm install --frozen-lockfile`, `pnpm run check`, and `pnpm run release:pack`.
6. Inspect the release PR changelogs and verify all public versions are identical.
7. Dispatch **Publish npm packages** from `main`, choosing `latest`, `next`, or `beta`.
8. Approve the protected `npm` environment. Confirm trusted publishing/provenance succeeds.
9. For stable releases, verify the GitHub Release/tag and npm provenance for every package.
10. Package the VSIX separately, inspect it, and use the Marketplace’s protected release process.
11. Test a clean consumer installation and record any migration or known issue in the release.

The publishing workflow never runs on pull requests or forks. It uses GitHub OIDC and npm trusted
publishing; do not add a long-lived `NPM_TOKEN`. npm account 2FA remains enabled for login and
settings changes. The `npm` GitHub environment must require owner approval and allow only `main`.

## First public release: owner actions

Before the first public release, an owner must:

1. Verify all 17 individual package names under the owner-controlled `@cascade-code` npm
   organization are available and legally appropriate. Organization ownership does not prove that
   any individual package has been registry-verified or published.
2. Grant least-privilege npm organization maintainer access, require 2FA, and set package access to
   public.
3. For every public package, configure npm trusted publishing with these exact npm UI values:
   GitHub organization or user `AbdulGani07`, repository `cascade`, workflow filename `publish.yml`,
   environment `npm`, and allowed action `npm publish`.
4. In GitHub, protect `main`, require CI/security reviews, disallow force pushes, create the `npm`
   environment with required reviewers and deployment branch `main`, and restrict Actions to trusted
   actions. Protect `v*` tags from manual creation.
5. Enable GitHub artifact attestations and immutable releases where available.
6. Confirm the `cascade-code` VS Code Marketplace publisher, its verified domain, owner access, MFA,
   and a protected `vscode-marketplace` environment. Prefer Microsoft-supported Entra ID
   authentication for future automation. Store a minimally scoped Marketplace PAT only there if
   trusted identity is unavailable; never expose it to pull-request workflows.
7. Resolve the documentation statements that packages are unpublished only after registry
   installation has been independently verified.

No secret is required for npm trusted publishing. `GITHUB_TOKEN` is supplied by GitHub. No
Marketplace credential is required for local VSIX packaging. Any credential for a later, separately
approved Marketplace publication workflow must use the protected environment above.

The clean tarball installation currently reports Tree-sitter peer-range warnings caused by the
existing grammar dependency ranges. They are known and do not prevent installation or CLI execution.
Resolve them in a dedicated dependency-compatibility change rather than during package publication.

## Stable and prerelease procedures

For a stable release, create normal changesets, merge the release PR, dispatch the publish workflow
with `latest`, and complete the checklist above.

For a prerelease line, run `pnpm changeset pre enter next` (or `beta`), add/consume changesets, merge
the release PR, and dispatch with the matching dist-tag. Repeat with `pnpm changeset version` for
subsequent prereleases. Run `pnpm changeset pre exit`, add a final changeset if needed, merge the
stable release PR, and dispatch with `latest`. Never publish a prerelease version under `latest`.

Release tags must be created only by the protected `Publish npm packages` workflow after every npm
publication succeeds. Configure a repository tag ruleset for `v*` that restricts tag creation and
deletion to repository administrators and the publishing workflow's GitHub Actions identity. The
repository cannot prove that owner-managed ruleset from workflow code, so owners must verify it
before each stable release. Do not add an always-failing tag workflow: it also rejects legitimate
tags created through the protected release path.

### Maintainer commands

- Start `next`: `pnpm changeset pre enter next`, add a changeset, run
  `pnpm run release:version`, `pnpm run vscode:version:prepare`, and `pnpm run release:validate`.
- Publish a prerelease: dispatch **Publish npm packages** with `next`; package the extension with
  `pnpm --filter cascade-code-intelligence run package:prerelease` and publish it with Marketplace
  prerelease status through the separately protected process.
- Promote to stable: `pnpm changeset pre exit`, run `pnpm run release:version`,
  `pnpm run vscode:version:prepare`, and `pnpm run release:validate`; dispatch npm with `latest`,
  then package with `pnpm --filter cascade-code-intelligence run package`.
- Emergency patch: from the stable branch run `pnpm changeset`, select patch, then
  `pnpm run release:version`, `pnpm run vscode:version:prepare`, and
  `pnpm run release:validate`; use the same protected stable publication sequence.

Do not run prerelease enter/exit as part of validation. Git tags and GitHub Releases are created
only after stable npm publication succeeds. Before approval, compare `npm view
@cascade-code/cli dist-tags`, `git tag --list`, and the repository Releases page; missing historical
tags or releases require an owner repair and must not be papered over by a new package publication.

## Published-state audit (2026-08-01)

All 17 npm packages agree: `latest` is `3.3.0` and `next` is `3.3.1-next.0`. The Marketplace API
reports only numeric `3.3.0`, flagged prerelease; it does not report `3.3.1`. Remote Git tags stop at
`v3.1.1`, and GitHub has no published `v3.3.0` Release. Consequently `3.3.1` is the lowest unused
coordinated stable candidate. The missing historical tag and Release are warnings, not permanent
blocks on a later release. Do not invent `v3.3.0`: only an owner who can establish its exact source
commit from trustworthy evidence may repair it. Publication validation remains strict for the new
target and requires exact npm, tag, Release, and Marketplace agreement at the appropriate stage.

## Rollback and deprecation

### VS Code Marketplace workflow

The **Publish VS Code extension** workflow is manual-only on `main`. It accepts `prerelease` or
`stable` and defaults to a dry run. Its build job has read-only repository permission and no
Marketplace secret. It runs the repository checks, validates npm/GitHub/Marketplace state, creates
all six target-specific VSIX files, enforces the 70 MiB installed-size budget, and uploads the
files as a 14-day Actions artifact. Only a non-dry run starts the separately protected
`vscode-marketplace` environment job.

Use a secret named `VSCE_PAT` in that environment. It must be a minimally scoped Azure DevOps PAT
authorized only to manage publisher `cascade-code`; do not define it as a repository or organization
secret. `@vscode/vsce@3.9.2` consumes `VSCE_PAT` only in the `vsce publish --packagePath` step. The
workflow deliberately does not pass `--skip-duplicate`: an existing version is an error. Configure
the environment with required owner review, deployment branch `main` only, no administrator bypass,
and an appropriate wait timer. Protect `main`, require CI/security checks, and restrict Actions to
approved pinned actions.

Local or Actions dry run:

```bash
pnpm run vscode:release:dry-run -- --channel prerelease
```

Alternatively, choose `channel=prerelease` and `dry-run=true` in the workflow UI.

For a real prerelease, publish npm `next` first, confirm `pnpm run release:state`, then dispatch from
`main` with `channel=prerelease` and `dry-run=false`. Approve the environment only after inspecting
the build job and VSIX artifact. For stable, publish npm `latest` and create its protected
`v<version>` GitHub Release first; dispatch with `channel=stable` and `dry-run=false`. The workflow
requires npm `latest`, source, Marketplace numeric version, and GitHub Release to agree, then attaches
all stable target VSIX files to that Release without overwriting existing assets.

Marketplace versions cannot be deleted or replaced safely. To roll back an extension, stop pending
environment deployments, mark the affected Marketplace version as deprecated/unavailable through
the owner-controlled Marketplace UI when supported, document the issue in the GitHub Release, and
publish a corrected incremented patch through the same workflow. Never reuse a version, overwrite a
Release asset, expose the PAT, or use `--skip-duplicate`. Rotate `VSCE_PAT` immediately after any
suspected disclosure and preserve workflow logs for incident response.

npm versions are immutable and should not normally be unpublished. To roll back:

1. Stop the workflow/environment and identify affected versions and packages.
2. Publish a corrected patch (or prerelease) through the same reviewed process.
3. Move the affected dist-tag: `npm dist-tag add @cascade-code/<package>@<good-version> latest`.
4. Mark each bad version: `npm deprecate @cascade-code/<package>@<bad-version> "<reason>; use <version>"`.
5. Update the GitHub Release with a prominent warning and migration/mitigation guidance.
6. For a security incident, follow `SECURITY.md`, rotate any affected credentials, and preserve logs.

Unpublish only when npm policy permits and the owner determines that legal or severe security harm
outweighs ecosystem breakage. Deprecations must name the replacement and planned removal release;
removal is a major change.
