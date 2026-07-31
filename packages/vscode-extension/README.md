# Cascade Code Intelligence

Local dependency, change-impact, cycle, architecture, and affected-test intelligence powered by
Cascade.

## Privacy and execution

Cascade analyzes files on your machine. It does not include telemetry, upload source code, or require
a hosted Cascade account. Background analysis is disabled by default and runs only after you enable
`cascade.backgroundAnalysis`. The extension reads project files as data; it does not execute source
code from the workspace.

The dashboard is served locally with a random access token and is not intended for network exposure.

## Commands

- **Cascade: Analyze Current File**
- **Cascade: Show Dependents**
- **Cascade: Show Dependency Path**
- **Cascade: Show Affected Tests**
- **Cascade: Open Dashboard**
- **Cascade: Refresh Workspace**

## Settings

| Setting                      | Default  | Purpose                                     |
| ---------------------------- | -------- | ------------------------------------------- |
| `cascade.backgroundAnalysis` | `false`  | Analyze locally after saved changes         |
| `cascade.debounceMs`         | `750`    | Saved-change analysis delay                 |
| `cascade.maxFiles`           | `100000` | Maximum files in an analysis graph          |
| `cascade.maxEdges`           | `300000` | Maximum dependency edges                    |
| `cascade.maxTraversalDepth`  | `30`     | Maximum transitive-query depth              |
| `cascade.codeLens`           | `true`   | Show dependency and impact counts           |
| `cascade.servicePath`        | empty    | Optional editor-service executable override |
| `cascade.cliPath`            | empty    | Optional Cascade CLI executable override    |

## Language support and limitations

Cascade supports the languages and confidence levels listed in the
[language-support guide](../../docs/LANGUAGE_SUPPORT.md). Results depend on static evidence,
available project metadata, configured limits, generated-code exclusions, and unresolved dynamic
imports. Treat affected-test output and change-risk indicators as review aids rather than proofs.

Multi-root workspaces and paths containing spaces, parentheses, and Unicode are supported. A local
Node.js runtime compatible with the extension’s VS Code host is required.

## Installation

For the first Marketplace beta, open the extension page, choose **Switch to Pre-Release Version**,
and confirm publisher `cascade-code`. To install an inspected VSIX manually, run:

```powershell
code --install-extension "cascade-code-intelligence-3.3.0-prerelease.vsix" --force
```

## Troubleshooting and support

If analysis does not start, open a workspace folder, run **Cascade: Refresh Workspace**, and check
that configured file and edge limits are appropriate. For dashboard launch failures, install the
Cascade CLI or set `cascade.cliPath`.

Use [GitHub Issues](https://github.com/AbdulGani07/cascade/issues) for support. Report suspected
security issues through the repository’s
[security policy](https://github.com/AbdulGani07/cascade/security/policy), not a public issue.
