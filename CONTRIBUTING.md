# Contributing to Cascade

Thank you for helping improve Cascade. Contributions are governed by the [Code of Conduct](CODE_OF_CONDUCT.md).

## Set up

Prerequisites are Node.js 22.13 or newer and pnpm 9 or newer.

```bash
git clone https://github.com/AbdulGani07/cascade.git
cd cascade
corepack enable
pnpm install --frozen-lockfile
pnpm run build
```

## Development checks

```bash
pnpm run check
pnpm run format
pnpm run test:docs
```

Run `pnpm run benchmark` for graph or performance-sensitive changes. Include before-and-after measurements when claiming a performance improvement.

## Change expectations

- Add regression tests for fixes and tests at the claimed capability level for features.
- Do not execute source code or build configuration from analyzed repositories.
- Keep traversal, parsing, graph, output, and cache behavior bounded.
- Document new configuration, commands, report fields, and security implications.
- Update the capability matrix only when fixtures and tests support the claim.
- Keep output deterministic and use project-relative paths by default.
- Use conventional commit subjects such as `fix: reject symlink root escape`.

## Documentation

Documentation has one canonical page per topic; link to it instead of copying long sections. The docs validator checks local links, heading structure, JSON examples, known CLI commands, schema keys, and common spelling errors.

When UI behavior changes, update the checked dashboard images with the reproducible local fixture and review them before committing.

## Pull requests

Keep each pull request focused, link related issues, explain important tradeoffs, and disclose behavior that remains unsupported. All CI checks must pass. Security-sensitive changes require independent review.

## Security reports

Do not open public issues for vulnerabilities. Follow [SECURITY.md](SECURITY.md).

See [Release policy](docs/RELEASE_POLICY.md) and [Project governance](docs/GOVERNANCE.md).
