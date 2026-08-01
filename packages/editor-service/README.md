# `@cascade-code/editor-service`

Provides the local workspace-analysis protocol and stateful query service used by Cascade editor integrations.

## Should I install it directly?

Usually no. The Cascade VS Code extension bundles this package; install it only when implementing or testing another editor client against the public service API.

```bash
npm install @cascade-code/editor-service@next
```

## Usage

```ts
import { WorkspaceAnalysisService } from "@cascade-code/editor-service";

const service = new WorkspaceAnalysisService();
```

Main responsibilities include the versioned editor request/response protocol, workspace descriptors and health, dependency/impact/affected-test query types, cancellation, resource limits, and `WorkspaceAnalysisService`.

## Environment and privacy

Requires Node.js 22.13 or newer. The service analyzes local workspace content and is designed to remain local to an editor process; clients are responsible for access control before exposing it over any transport.

## Limitations

The service inherits core static-analysis limitations and resource bounds. Saved-file refreshes do not turn static evidence into runtime or compiler-semantic guarantees.

[Documentation](../../docs/README.md) · [VS Code extension](../../docs/VSCODE_EXTENSION.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
