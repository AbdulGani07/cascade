# VS Code extension

The repository includes the `Cascade Code Intelligence` extension for VS Code 1.96 or newer. It uses the local editor service and does not require a hosted Cascade account.

## Build and install

```bash
pnpm install --frozen-lockfile
pnpm run build
pnpm --dir packages/vscode-extension run package
code --install-extension packages/vscode-extension/cascade-code-intelligence.vsix
```

The packaging command prints the exact generated file name. Use that path if it includes a version suffix.

## Commands

- `Cascade: Analyze Current File`
- `Cascade: Show Dependents`
- `Cascade: Show Dependency Path`
- `Cascade: Show Affected Tests`
- `Cascade: Open Dashboard`
- `Cascade: Refresh Workspace`

## Settings

| Setting                      | Default  | Purpose                                |
| ---------------------------- | -------- | -------------------------------------- |
| `cascade.backgroundAnalysis` | `false`  | Opt in to analysis after saved changes |
| `cascade.debounceMs`         | `750`    | Delay before saved-change analysis     |
| `cascade.maxFiles`           | `100000` | File-graph limit                       |
| `cascade.maxEdges`           | `300000` | Edge limit                             |
| `cascade.maxTraversalDepth`  | `30`     | Transitive query depth                 |
| `cascade.codeLens`           | `true`   | Show dependency and impact counts      |
| `cascade.servicePath`        | empty    | Override editor-service executable     |
| `cascade.cliPath`            | empty    | Override dashboard CLI executable      |

Background analysis is off by default to keep workspace startup predictable.

## Privacy and limits

Analysis is local. The extension starts local Cascade processes and inherits the user’s workspace permissions. Plugin capability, configured limits, unresolved dependencies, and generated code affect results in the same way as the CLI.
