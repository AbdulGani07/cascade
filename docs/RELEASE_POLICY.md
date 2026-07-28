# Release policy

Cascade uses semantic versioning for public packages and the repository release.

## Version meaning

- **Patch** releases contain compatible fixes, documentation corrections, and internal improvements.
- **Minor** releases add backward-compatible features or capability.
- **Major** releases may include documented breaking changes.

Because static-analysis output is itself consumed by automation, a material change in finding shape, schema, rule identity, or exit behavior is treated as a compatibility concern even when the TypeScript API is unchanged.

## Release requirements

Before a release:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run format
pnpm run test:docs
pnpm run benchmark
```

Maintainers update package versions together where workspace compatibility requires it, update `CHANGELOG.md`, validate the VS Code package, and review security and dependency-scanning results.

## Deprecation

Deprecations should identify the replacement and intended removal release. Security fixes may require faster removal of unsafe behavior.

## Support

The latest release is the primary supported line unless a maintainer announces a separate maintenance branch. See [SECURITY.md](../SECURITY.md) for private vulnerability reporting.
