# Architecture and data flow

## Components

```mermaid
flowchart LR
  CLI["CLI"] --> Core["Core analysis pipeline"]
  Action["GitHub Action"] --> CLI
  Editor["Editor service"] --> Core
  VSCode["VS Code extension"] --> Editor
  Core --> Registry["Plugin registry"]
  Registry --> Plugins["Language plugins"]
  Core --> Graph["File and project graphs"]
  Graph --> Reporters["JSON / Markdown / SARIF"]
  Graph --> Dashboard["Local dashboard"]
```

## Analysis data flow

```mermaid
flowchart TD
  Root["Canonical project root"] --> Scan["Bounded file discovery"]
  Scan --> Detect["Plugin and project detection"]
  Detect --> Parse["Parse and extract dependencies"]
  Parse --> Resolve["Resolve internal / external / unresolved targets"]
  Resolve --> Index["Adjacency and reverse-adjacency indexes"]
  Index --> Analyze["SCCs, entry points, dead files, impact, governance"]
  Analyze --> Normalize["Relative paths and report redaction"]
  Normalize --> Output["CLI, reports, dashboard, editor queries"]
```

Cascade reads source and build metadata as data. It does not intentionally run
analyzed source or build configuration.

## Plugin lifecycle

```mermaid
sequenceDiagram
  participant Core
  participant Registry
  participant Plugin
  participant Resolver
  Core->>Registry: find plugin for path
  Registry-->>Core: highest-priority enabled plugin
  Core->>Plugin: parse(context)
  Plugin-->>Core: AST/status/diagnostics
  Core->>Plugin: extractDependencies(context)
  Plugin-->>Core: dependency evidence
  Core->>Resolver: resolve each specifier
  Resolver-->>Core: target/status/confidence
  Core->>Plugin: extractSymbols(context), if supported
  Core-->>Core: add nodes, edges, diagnostics
```

Plugin calls are exception-isolated, but third-party plugins execute in-process
and are trusted code. See [Plugin development](PLUGIN_DEVELOPMENT.md) and
[Security](SECURITY.md).
