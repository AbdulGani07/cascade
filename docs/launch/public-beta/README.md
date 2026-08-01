# Cascade public-beta launch package

> Historical beta runbook. The 3.3.1 stable release-candidate evidence is in
> `../../../docs/FINAL_LAUNCH_AUDIT.md`; do not use this file as current publication state.

This directory contains owner-ready drafts and checklists. Nothing here publishes a package,
changes an external setting, creates a release, or posts an announcement.

## 1. Verified launch facts

- Repository: `https://github.com/AbdulGani07/cascade`
- npm organization: `@cascade-code`; CLI package: `@cascade-code/cli`; executable: `cascade`
- npm beta channel: `next` at `3.3.1-next.0`; stable `latest` remains `3.3.0`
- Marketplace publisher: `cascade-code`; extension: `cascade-code-intelligence`
- Public Marketplace prerelease: numeric `3.3.0`; `3.3.1` remained unused at the stable-candidate check
- Marketplace prerelease status is supplied by VSCE `--pre-release`
- Analysis is local, telemetry-free, and does not require a hosted Cascade account

These facts were verified for the public-beta preparation. External state can change and must be
rechecked on launch day.

## 2. GitHub repository description

Local dependency intelligence and change-impact analysis for polyglot codebases, with a CLI,
dashboard, architecture governance, and VS Code integration.

## 3. Recommended GitHub topics

`dependency-analysis`, `change-impact-analysis`, `static-analysis`, `code-intelligence`,
`architecture`, `developer-tools`, `typescript`, `python`, `monorepo`, `vscode-extension`

## 4. Public-beta release notes

Cascade's public beta provides local dependency graph analysis, impact exploration, cycle
diagnostics, architecture governance, affected-test candidates, reports, a loopback-only dashboard,
and a VS Code prerelease. The npm beta is `@cascade-code/cli@next`; the Marketplace prerelease is
published by `cascade-code`.

This is a review aid based on static evidence. Dynamic imports, generated code, framework behavior,
project metadata, configured limits, and language-plugin capability can affect results. It is not a
compiler, language server, or guarantee that a change will or will not break.

## 5. npm installation

```sh
npm install --global @cascade-code/cli@next
cascade --version
cascade doctor .
```

Do not remove `@next` during beta. `latest` intentionally remains the stable channel.

## 6. Marketplace prerelease installation

In VS Code Extensions, find **Cascade Code Intelligence** by verified publisher `cascade-code` and
choose **Install Pre-Release Version**. For owner review of the prepared artifact:

```powershell
code --install-extension ".\packages\vscode-extension\cascade-code-intelligence-3.3.1-win32-x64-prerelease.vsix" --force
```

Version `3.3.1` must be uploaded with prerelease status. A future stable extension must use a
version greater than `3.3.1`; neither `3.3.0` nor `3.3.1` may be reused.

## 7. Reproducible CLI demo

```sh
git clone https://github.com/AbdulGani07/cascade.git
cd cascade
npm install --global @cascade-code/cli@next
cascade doctor examples/vscode-extension-demo
cascade analyze examples/vscode-extension-demo
cascade graph examples/vscode-extension-demo
```

Use a disposable clone and record the exact CLI version with `cascade --version`.

## 8. Reproducible VS Code demo

Run `.\scripts\prepare-vscode-marketplace-screenshots.ps1` from the repository root, then follow
[`docs/VSCODE_MARKETPLACE_SCREENSHOTS.md`](../../VSCODE_MARKETPLACE_SCREENSHOTS.md). The committed
demo contains real TypeScript dependencies, the deliberate `orders.ts`/`pricing.ts` cycle,
transitive impact through `app.ts`, and an affected test candidate.

## 9. Known limitations

- Static evidence cannot resolve every dynamic import, runtime registration, generated file, or
  framework convention.
- Language capabilities vary; expanded-language support is not compiler or language-server parity.
- Affected tests are candidates with evidence, not guaranteed complete selections.
- Impact and dependency results are review aids, not guaranteed breakage detection.
- Large workspaces may require file, edge, traversal, ignore, or project-selection configuration.
- Third-party plugins run with the host process's permissions and are not a sandbox boundary.

## 10. Privacy and security

Cascade analyzes local files and includes no telemetry. It does not upload source to a Cascade
service. The dashboard binds to `127.0.0.1`, uses a random access token, and is not intended for
network exposure. Report suspected vulnerabilities privately through
`https://github.com/AbdulGani07/cascade/security/policy`.

## 11. Native Tree-sitter dependency FAQ

**Why can installation include native packages?** Some language analyzers use Tree-sitter parsers
that ship native components for supported platforms.

**Does Cascade execute the analyzed project?** No. Cascade reads project source and metadata as
data; it does not run workspace source or build tools.

**What if a native parser is unavailable?** Run `cascade doctor .`, confirm the supported Node.js
and platform environment, and include non-sensitive diagnostic output in a GitHub issue. Do not
claim full analysis when a required parser did not load.

## 17. Contributor invitation

Contributions are welcome in language accuracy, fixtures, documentation, performance, editor
experience, and reproducible bug reports. Start with `CONTRIBUTING.md`, follow the Code of Conduct,
and use a focused issue or pull request with a minimal public fixture. Never attach proprietary
source or credentials.

## 24. Stable-readiness criteria

- Beta feedback has no unresolved release-blocking security, data-leakage, installation, or
  corruption issue.
- Supported platforms pass clean install, dependency-tree, CLI, extension, and dashboard checks.
- Documented language claims match evidence from public fixtures.
- Packaging contains only intended runtime files, and provenance/attestations remain observable.
- Dashboard loopback/token protections and telemetry-free behavior remain verified.
- Support, security response, upgrade, rollback, and changelog procedures are operational.
- Stable npm and Marketplace versions are new, coordinated, reviewed versions; Marketplace stable
  must be greater than `3.3.1`.
- The owner explicitly approves promotion; beta channels are never implicitly promoted.

See the companion files for announcement drafts, demos, operations, feedback, and external-setting
checks.
