# Release policy

Cascade uses semantic versioning and Changesets for its 17 public npm packages. Public packages
currently move as one fixed version group because the CLI, analysis engine, language plugins,
reporters, configuration, editor service, and plugin API form one tested product surface.

## Version and compatibility policy

- **Patch**: compatible fixes, documentation corrections, performance work, and dependency updates.
- **Minor**: backward-compatible features, new optional fields, languages, commands, or plugin hooks.
- **Major**: removals or incompatible CLI, schema, configuration, package export, or plugin API changes.
- Node.js `>=22.13.0` is supported. Raising this floor is a breaking change and requires a major
  release unless the dropped Node line is already end-of-life and the release notes explicitly say so.
- JSON outputs carry a `schemaVersion`. Additive changes retain the schema major; removals, meaning
  changes, or newly required fields increment it. Readers must reject unknown major versions and
  ignore unknown fields within a known major. The current governance and Git-impact schema is `1.0`.
- `@cascade/plugin-api` follows the package major. Additive optional interfaces are minor; removing or
  changing required contracts is major. Third-party plugins should use a compatible peer range and
  test against the oldest and newest supported API release.

Every user-visible change needs a changeset. A breaking changeset must include migration guidance.
Changesets update package changelogs and the root release PR; GitHub-generated notes complement, but
do not replace, those migration notes.

## Package ownership and boundaries

The public packages are `@cascade/cli`, `@cascade/config`, `@cascade/core`,
`@cascade/editor-service`, every `@cascade/language-*` package, `@cascade/plugin-api`, and
`@cascade/reporters`. Internal runtime dependencies use `workspace:^` and become compatible npm
ranges when packed.

`@cascade/dashboard` is private and its built static assets are copied into `@cascade/cli/dist`.
It is never resolved through a repository-relative path after installation. `@cascade/test-utils`
is private development support. `cascade-code-intelligence` is private to npm and is distributed
only as a VSIX through the VS Code Marketplace workflow.

## Release checklist

1. Add and review changesets, including migrations and the correct SemVer level.
2. Merge to `main`; review and merge the generated `chore: release packages` pull request.
3. Confirm CI, security, `pnpm run release:validate`, and branch protection are green.
4. Confirm package names and the `@cascade` scope are owned by the publishing organization.
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

1. Verify that the `@cascade` npm organization/scope and all 17 package names are available and
   legally appropriate. If not, rename packages and internal imports before release.
2. Create or confirm the npm organization, grant least-privilege maintainer access, require 2FA, and
   set package access to public.
3. For every public package, configure npm trusted publishing for repository
   `AbdulGani07/cascade`, workflow `.github/workflows/publish.yml`, and environment `npm`.
4. In GitHub, protect `main`, require CI/security reviews, disallow force pushes, create the `npm`
   environment with required reviewers and deployment branch `main`, and restrict Actions to trusted
   actions. Protect `v*` tags from manual creation.
5. Enable GitHub artifact attestations and immutable releases where available.
6. Confirm the `cascade-code` VS Code Marketplace publisher, its verified domain, owner access, 2FA,
   and a protected `vscode-marketplace` environment. Store a Marketplace PAT only there if VSCE
   trusted identity is unavailable; never expose it to pull-request workflows.
7. Resolve the documentation statements that packages are unpublished only after registry
   installation has been independently verified.

No secret is required for npm trusted publishing. `GITHUB_TOKEN` is supplied by GitHub. A
`VSCE_PAT` is required only for a later, separately approved Marketplace publication workflow.

## Stable and prerelease procedures

For a stable release, create normal changesets, merge the release PR, dispatch the publish workflow
with `latest`, and complete the checklist above.

For a prerelease line, run `pnpm changeset pre enter next` (or `beta`), add/consume changesets, merge
the release PR, and dispatch with the matching dist-tag. Repeat with `pnpm changeset version` for
subsequent prereleases. Run `pnpm changeset pre exit`, add a final changeset if needed, merge the
stable release PR, and dispatch with `latest`. Never publish a prerelease version under `latest`.

## Rollback and deprecation

npm versions are immutable and should not normally be unpublished. To roll back:

1. Stop the workflow/environment and identify affected versions and packages.
2. Publish a corrected patch (or prerelease) through the same reviewed process.
3. Move the affected dist-tag: `npm dist-tag add @cascade/<package>@<good-version> latest`.
4. Mark each bad version: `npm deprecate @cascade/<package>@<bad-version> "<reason>; use <version>"`.
5. Update the GitHub Release with a prominent warning and migration/mitigation guidance.
6. For a security incident, follow `SECURITY.md`, rotate any affected credentials, and preserve logs.

Unpublish only when npm policy permits and the owner determines that legal or severe security harm
outweighs ecosystem breakage. Deprecations must name the replacement and planned removal release;
removal is a major change.
