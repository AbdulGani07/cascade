# Editor integrations

Cascade provides a reusable local editor service and an official VS Code extension source package.
Both use `@cascade/core`; there is no editor-specific analysis engine.

## Architecture

```text
VS Code extension host
  -> JSON-lines client (paths and query parameters only)
     -> cascade-editor-service process
        -> cancellable analysis worker
        -> per-workspace graph snapshot and bounded query cache
        -> @cascade/core and first-party language plugins
```

Analysis runs outside the extension host, so parsing cannot block typing. Each workspace folder has
an independent snapshot, generation number, dirty-file set, and health state. Saved changes
invalidate only their workspace, are debounced, and currently trigger a deterministic workspace
refresh through the shared core engine. Unsaved document contents are never copied into the service.

The service protocol is versioned as `1.0` and uses one JSON request or response per line. Requests
are limited to 1 MB.

| Area         | Methods                                                                           |
| ------------ | --------------------------------------------------------------------------------- |
| Lifecycle    | `initialize`, `shutdown`, `cancel`, `health`                                      |
| Workspaces   | `workspace/add`, `workspace/remove`, `workspace/refresh`, `workspace/updateFile`  |
| Graph        | `query/dependencies`, `query/dependents`, `query/impact`, `query/explanationPath` |
| Intelligence | `query/diagnostics`, `query/entryPoint`, `query/affectedTests`                    |

`@cascade/editor-service` also exports `WorkspaceAnalysisService` for in-process integrations.
Consumers should depend on exported protocol types rather than parsing CLI output.

## VS Code

The extension contributes dependency/dependent and transitive-impact CodeLens; cycle,
architecture-rule, unresolved-dependency, and parser diagnostics; commands for impact, navigation,
affected-test candidates, refresh, and the dashboard; a status-bar health indicator; and multi-root
workspace lifecycle support.

Background analysis is opt-in. Unsupported files receive no fabricated results; the service returns
empty graph evidence when the core has no applicable plugin.

For the development VSIX, install the service and CLI locally or set explicit paths:

```sh
npm install --global @cascade/editor-service @cascade/cli
code --install-extension packages/vscode-extension/cascade-code-intelligence.vsix
```

The monorepo build resolves workspace packages directly. The standalone VSIX falls back to
`cascade-editor-service` and `cascade` on `PATH`.

## Configuration

| Setting                      |  Default | Purpose                                      |
| ---------------------------- | -------: | -------------------------------------------- |
| `cascade.backgroundAnalysis` |  `false` | Analyze after saved changes                  |
| `cascade.debounceMs`         |    `750` | Saved-change debounce                        |
| `cascade.maxFiles`           | `100000` | Hard file-count safeguard                    |
| `cascade.maxEdges`           | `300000` | Hard edge-count safeguard                    |
| `cascade.maxTraversalDepth`  |     `30` | Bound transitive queries                     |
| `cascade.codeLens`           |   `true` | Enable editor CodeLens                       |
| `cascade.servicePath`        |    empty | Service executable or server JavaScript path |
| `cascade.cliPath`            |    empty | CLI executable used by the dashboard command |

The service bounds its query cache to 500 entries by default. Resource-limit failures appear as
`limited` health rather than silently truncating analysis. Query results report traversal
truncation.

## Privacy and security

- Analysis is local by default and no network client exists in the extension or service.
- No telemetry is collected.
- Source text is not sent over the editor-service protocol.
- Only workspace roots, file paths, versions, settings, and query results cross the process boundary.
- Unsaved buffers are not analyzed. Saved files are read by the same static analyzer used by the CLI.
- Cascade does not execute analyzed source code.
- The dashboard binds to localhost.

## Cancellation and performance

Core analysis runs in a worker thread owned by the service process. Cancellation terminates that
worker; query cancellation is immediate in the extension client. Debouncing coalesces save bursts.
Expensive work never runs in the VS Code extension host.

Run the deterministic synthetic benchmark:

```sh
node benchmarks/editor-service.mjs 50000
```

It constructs a 50,000-file/99,998-edge graph and measures snapshot refresh plus dependency,
dependent, impact, diagnostics, affected-test, and explanation queries. Results vary by machine.

Measured on the development Windows host on 2026-07-28:

|  Files |  Edges | Snapshot install | Six-query suite |  Heap used |
| -----: | -----: | ---------------: | --------------: | ---------: |
| 50,000 | 99,998 |          1.18 ms |       504.76 ms | 268.69 MiB |

Snapshot installation uses an already constructed graph and therefore does not represent parsing
time. The query-suite number is the relevant editor-service measurement; real repository analysis
time remains language, file-size, and storage dependent.

## Troubleshooting

- **Service cannot start:** install `@cascade/editor-service` globally or set
  `cascade.servicePath`.
- **Dashboard cannot start:** install `@cascade/cli` globally or set `cascade.cliPath`.
- **Status says limited:** raise safeguards carefully or use project selection in
  `cascade.config.json`.
- **No CodeLens data:** run **Cascade: Refresh Workspace**. Background analysis is disabled by
  default.
- **Unsupported language:** check the language-support matrix. Unsupported files are skipped.
- **Multi-root mismatch:** use paths within the owning folder. Outside paths are rejected.
- **Stale results after rapid saves:** run a manual refresh; older document versions are discarded.

## Publishing

The Marketplace publisher and extension name must be verified by the repository owner before
publishing. Do not assume `cascade-code` is available or controlled.

1. Build and test the complete monorepo.
2. Run `pnpm --dir packages/vscode-extension run package:validate`.
3. Run `pnpm --dir packages/vscode-extension run package`.
4. Install the VSIX into a clean profile and test every command with single- and multi-root fixtures.
5. Verify the owner-controlled publisher, authenticate VSCE with a narrowly scoped token, then run
   `vsce publish`.
6. Attach the exact tested VSIX and checksums to the matching GitHub release.

Publishing credentials must never enter repository files or CI logs.

## Future editors

JetBrains, Neovim, and other clients can use the versioned JSON-lines protocol or TypeScript API. A
future adapter should map editor cancellation, workspace folders, diagnostics, and navigation onto
these methods. Cascade does **not** currently claim completed JetBrains, Neovim, or generic LSP
integrations; this is language-server-compatible infrastructure, not a full LSP implementation.
