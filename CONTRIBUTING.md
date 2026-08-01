# Contributing to Cascade

Thank you for improving Cascade. Participation is governed by the
[Code of Conduct](CODE_OF_CONDUCT.md). No contributor licence agreement or DCO sign-off is currently
required; contributors retain copyright and license contributions under the repository's MIT license.

## Set up the repository

Prerequisites are Git, Node.js 22.13 or newer, and Corepack with pnpm 9.15.0.

```bash
git clone https://github.com/AbdulGani07/cascade.git
cd cascade
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install --frozen-lockfile
pnpm run build
```

Use a focused branch and never commit credentials, local caches, generated tarballs, VSIX files, or
absolute machine paths.

## Development commands

| Command                         | Purpose                                                         |
| ------------------------------- | --------------------------------------------------------------- |
| `pnpm run build`                | Build all workspaces and bundle the dashboard into the CLI      |
| `pnpm run lint`                 | Lint package TypeScript                                         |
| `pnpm run typecheck`            | Type-check all workspaces                                       |
| `pnpm run test:unit`            | Run unit tests                                                  |
| `pnpm run test:integration`     | Run integration tests                                           |
| `pnpm run test:e2e`             | Run CLI end-to-end tests                                        |
| `pnpm run test:docs`            | Validate documentation, links, examples, and CLI references     |
| `pnpm run check`                | Run lint, build, typecheck, tests, and documentation validation |
| `pnpm run benchmark`            | Run the benchmark suite                                         |
| `pnpm run benchmark:regression` | Check stable graph performance thresholds                       |
| `pnpm changeset`                | Record a user-visible package change                            |
| `pnpm run release:state`        | Validate and display the coordinated release versions           |

Run `pnpm run format` before submitting. Use `pnpm run format:fix` to apply formatting.

## Architecture and change routes

- Language-specific parsing and resolution belongs in `packages/language-*` and implements
  `@cascade-code/plugin-api`. Start with [Plugin development](docs/PLUGIN_DEVELOPMENT.md).
- Add compact, adversarial parser fixtures under `tests/fixtures`, then unit and integration tests
  at the capability level being claimed. Do not execute fixture source or build systems.
- Keep graph algorithms language-neutral in `packages/core`; retain evidence, provenance, bounded
  traversal, deterministic ordering, and confidence for approximate findings.
- Reporters belong in `packages/reporters`; follow
  [Reporter development](docs/REPORTER_DEVELOPMENT.md) and test escaping/redaction.
- Dashboard work belongs in `packages/dashboard`; update contract/component tests and reproducible
  screenshots when visible behavior changes.
- Schema changes require fixtures, serialization/migration tests, a compatibility decision, and
  documentation updates. See [JSON schema](docs/JSON_SCHEMA.md) and the authoritative
  [release policy](docs/RELEASE_POLICY.md).

## Tests and documentation

Bug fixes require a regression test. Features require unit tests plus integration or end-to-end
coverage at the public boundary they affect. Performance claims require reproducible before-and-after
measurements. Update capability claims only when fixtures and tests substantiate them.

Documentation has one authoritative page per topic. Cross-link instead of copying policy text.
`pnpm run test:docs` checks local links, headings, JSON examples, known CLI commands, schema keys, and
common spelling errors.

## Changesets and commits

Add a Changeset for user-visible behavior, public API, package, migration, or compatibility changes.
Documentation-only community-process changes normally do not need one. Use concise conventional
commit subjects such as `fix(core): reject symlink root escape`; maintainers may squash a pull
request during merge.

Do not manually edit public package or VS Code extension versions. Changesets owns the 17 public
package versions; maintainers derive the numeric Marketplace version with
`pnpm run vscode:version:prepare`. The complete npm/Marketplace mapping is in the
[release policy](docs/RELEASE_POLICY.md).

## Pull requests and review

Keep pull requests focused, link related issues, explain tradeoffs, list exact validation, and state
remaining limitations. Draft pull requests are welcome for early design feedback. Reviewers check
correctness, security boundaries, architecture placement, compatibility, tests, documentation,
performance, and release impact. Authors should not approve their own security-sensitive changes.

Maintainers triage contributions as capacity allows; response targets are goals, not guarantees.
See [Support](SUPPORT.md), [Governance](GOVERNANCE.md), and [Maintainers](MAINTAINERS.md).

Do not publish packages, tags, releases, or Marketplace extensions from contributor branches. Release
authority and procedures are defined in [Release policy](docs/RELEASE_POLICY.md).

## Security reports

Do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).
