# Cascade Code Intelligence

Understand dependencies, change impact, cycles, architecture boundaries, and affected-test
candidates without sending source code to a hosted service. Cascade runs analysis locally and keeps
background analysis off until you opt in.

> Marketplace packages use numeric SemVer; prerelease status is applied by VSCE/Marketplace rather
> than embedded in the version. A numeric version already uploaded on either channel is never reused.
> Stable npm and Marketplace releases use the same lowest available version. Maintainers must run
> `pnpm run vscode:version:prepare` and the live precondition validator, not edit it manually.

## Install

1. Open **Extensions** in VS Code.
2. Find **Cascade Code Intelligence** from publisher `cascade-code`.
3. Choose the stable version. To evaluate a future prerelease, choose **Switch to Pre-Release
   Version** only when the release notes explicitly identify that channel.

To install an inspected local package instead:

```powershell
code --install-extension "cascade-code-intelligence-3.3.1-win32-x64.vsix" --force
```

The extension requires VS Code `1.96.0` or newer.

## What you can do

- Analyze the active file and publish local diagnostics.
- See dependency, dependent, and transitive-impact counts through CodeLens.
- Inspect dependents and evidence-backed dependency paths.
- List affected-test candidates with stated confidence.
- Refresh one or more workspace folders.
- Open Cascade's token-protected dashboard on the loopback interface.

## Privacy and execution

Cascade analyzes files on your machine. It does not include telemetry, upload source code, or require
a hosted Cascade account. Background analysis is disabled by default and runs only after you enable
`cascade.backgroundAnalysis`. The extension reads project files as data; it does not execute source
code from the workspace.

The dashboard is served locally with a random access token and is not intended for network exposure.

## Commands and editor behavior

| Command                           | Behavior                                                                   |
| --------------------------------- | -------------------------------------------------------------------------- |
| **Cascade: Analyze Current File** | Refreshes the workspace, reports impact, and publishes Cascade diagnostics |
| **Cascade: Show Dependents**      | Lists direct and transitive dependents for the active file                 |
| **Cascade: Show Dependency Path** | Explains a static dependency path to a workspace-relative target           |
| **Cascade: Show Affected Tests**  | Lists test candidates and their evidence confidence                        |
| **Cascade: Open Dashboard**       | Starts the bundled CLI dashboard locally                                   |
| **Cascade: Refresh Workspace**    | Rebuilds analysis for every open workspace folder                          |

CodeLens is enabled by default and shows dependency, dependent, and transitive-impact counts above
the first line. Diagnostics are published after an explicit analysis or refresh. Saved-file
analysis remains disabled until `cascade.backgroundAnalysis` is enabled.

## Settings

| Setting                      |  Default | Purpose                                     |
| ---------------------------- | -------: | ------------------------------------------- |
| `cascade.backgroundAnalysis` |  `false` | Analyze locally after saved changes         |
| `cascade.debounceMs`         |    `750` | Saved-change analysis delay                 |
| `cascade.maxFiles`           | `100000` | Maximum files in an analysis graph          |
| `cascade.maxEdges`           | `300000` | Maximum dependency edges                    |
| `cascade.maxTraversalDepth`  |     `30` | Maximum transitive-query depth              |
| `cascade.codeLens`           |   `true` | Show dependency and impact counts           |
| `cascade.servicePath`        |    empty | Optional editor-service executable override |
| `cascade.cliPath`            |    empty | Optional Cascade CLI executable override    |

## Language support and limitations

Structured analysis covers JavaScript, TypeScript, Python, Java, Kotlin, C#, Go, Rust, C, and C++.
Additional plugins provide syntax-aware, pattern-based, or metadata-oriented evidence for PHP,
Ruby, Swift, Dart, Shell, PowerShell, Lua, R, Vue, Svelte, HTML, stylesheets, GraphQL, and opt-in
SQL. Capabilities vary by plugin; “supported” does not imply compiler or language-server parity.
See the
[language support guide](https://github.com/AbdulGani07/cascade/blob/main/docs/LANGUAGE_SUPPORT.md)
and
[capability matrix](https://github.com/AbdulGani07/cascade/blob/main/docs/CAPABILITY_MATRIX.md).

Results depend on static evidence, available project metadata, configured limits, generated-code
exclusions, and unresolved dynamic imports. Affected-test candidates, dependency paths, and impact
counts are review aids rather than proofs. Cascade does not execute workspace build tools or source
files. Third-party Cascade plugins run with the extension process's permissions and are not an
isolation boundary.

Multi-root workspaces and paths containing spaces, parentheses, and Unicode are supported. A local
Node.js runtime compatible with the extension's VS Code host is required.

## Relationship to the npm CLI

The Marketplace extension bundles the Cascade CLI and editor service needed for its features. The
separately published `@cascade-code/cli@next` package is the public-beta command-line channel and
uses its own npm version sequence. Installing the npm CLI is optional unless you explicitly
configure `cascade.cliPath` to use another CLI executable.

## Troubleshooting and support

If analysis does not start, open a workspace folder, run **Cascade: Refresh Workspace**, and check
that configured file and edge limits are appropriate. For dashboard launch failures, leave
`cascade.cliPath` empty to use the bundled CLI, or configure an inspected compatible CLI.

Use [GitHub Issues](https://github.com/AbdulGani07/cascade/issues) for support. Report suspected
security issues through the repository's
[security policy](https://github.com/AbdulGani07/cascade/security/policy), not a public issue.
