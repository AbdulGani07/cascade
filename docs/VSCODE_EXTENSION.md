# VS Code extension

`Cascade Code Intelligence` targets VS Code 1.96 or newer. Its Marketplace identity is
`cascade-code.cascade-code-intelligence`; the npm-private package is never published to npm.

## Version sequence

Marketplace prereleases use ordinary numeric `major.minor.patch` versions plus the Marketplace
prerelease flag. They do not use npm prerelease suffixes.

- First Marketplace prerelease: extension `3.3.0`, packaged with `vsce --pre-release`.
- Current npm public beta: `@cascade-code/*@3.3.1-next.0`; it is a separate distribution channel.
- Recommended later Marketplace stable: `3.3.1` after the prerelease is accepted and stable
  readiness is approved. Do not reuse `3.3.0` for stable because the Marketplace requires a higher
  version to supersede the prerelease.

## Build, inspect, and install

```bash
pnpm install --frozen-lockfile
pnpm --filter "cascade-code-intelligence" run typecheck
pnpm --filter "cascade-code-intelligence" run build
pnpm --filter "cascade-code-intelligence" run package:validate
pnpm --filter "cascade-code-intelligence" run package
pnpm --filter "cascade-code-intelligence" run package:prerelease
pnpm --filter "cascade-code-intelligence" run package:contents
```

`package` creates `cascade-code-intelligence-3.3.0.vsix`.
`package:prerelease` creates `cascade-code-intelligence-3.3.0-prerelease.vsix` with official VSCE
prerelease metadata. Both commands deploy a production-only dependency tree into a temporary,
path-checked `.vsix-stage` directory, validate the package contents, and remove the stage afterward.
Each VSIX has a JSON content manifest beside it for owner inspection.

Install the inspected prerelease in an isolated profile:

```powershell
$profile = Join-Path $env:TEMP "cascade-vscode-prerelease"
code `
  --user-data-dir "$profile\user-data" `
  --extensions-dir "$profile\extensions" `
  --install-extension "packages/vscode-extension/cascade-code-intelligence-3.3.0-prerelease.vsix" `
  --force
```

## Manual prerelease checklist

1. Verify publisher `cascade-code`, display name `Cascade Code`, owner access, and Microsoft-account
   MFA.
2. Inspect the VSIX and its generated content manifest. Confirm no secrets, source maps, fixtures,
   tests, caches, local paths, npm tarballs, or release artifacts are present.
3. Install into the isolated profile above and test activation, all six commands, diagnostics,
   CodeLens, dashboard launch, saved-file opt-in, cancellation, multi-root workspaces, and TypeScript,
   Python, polyglot, unsupported, and malformed-source projects.
4. Repeat with workspace paths containing spaces, parentheses, and Unicode. Uninstall, reinstall,
   and confirm no stale state remains.
5. Observe network activity and confirm analysis remains local.
6. Upload the inspected VSIX to publisher `cascade-code`, mark it as a prerelease, install
   **Pre-Release Version** from the Marketplace, and verify the publisher and listing.

These are owner actions. Packaging does not publish or change Marketplace settings.

## Future automation

Prefer Microsoft-supported Entra ID authentication for a protected, manually dispatched
`vscode-marketplace` environment when the Marketplace and VSCE support it for this publisher. If a
PAT remains necessary, scope it minimally, store it only in that protected environment, rotate it,
and never expose it to pull-request workflows. No external identity or secret is configured by this
repository.

## Privacy, behavior, and limitations

Analysis is local, telemetry-free, and opt-in after saved changes. The extension does not execute
workspace source code. It starts the bundled editor service and CLI, inherits the user’s filesystem
permissions, and applies configured graph limits. See the
[Marketplace README](../packages/vscode-extension/README.md) for commands, settings, language
support, troubleshooting, and security-reporting links.
