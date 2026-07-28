# Language support

Cascade uses first-party plugins selected by extension and priority. “Supported”
means a plugin can identify at least some dependency evidence; it does not mean
feature parity with a compiler or language server.

## Capability levels

- **Structured:** grammar-backed parsing and language-aware extraction
- **Syntax-aware:** useful structural or targeted parsing with known gaps
- **Pattern-based:** bounded text extraction with more conservative confidence
- **Metadata/asset:** relationships from non-executable configuration or assets

## Supported languages and formats

| Family               | Plugins                                         |
| -------------------- | ----------------------------------------------- |
| JavaScript ecosystem | JavaScript, JSX, TypeScript, TSX                |
| Python               | Python and Python stubs                         |
| JVM                  | Java, Kotlin, Kotlin script                     |
| .NET                 | C#                                              |
| Go                   | Go source, modules, workspaces                  |
| Rust                 | Rust source and Cargo metadata                  |
| Native               | C, C++, headers, common native build metadata   |
| Scripting            | PHP, Ruby, Shell, PowerShell, Lua, R            |
| Apple/mobile         | Swift, Dart                                     |
| Components/web       | Vue, Svelte, HTML, CSS, Sass, Less              |
| Data/query           | GraphQL; SQL is present but disabled by default |

## What varies by plugin

A plugin may provide:

- dependency extraction;
- module resolution;
- symbol declarations;
- test/generated/config detection;
- entry-point and framework evidence;
- project detection;
- build metadata relationships.

The analyzer includes a plugin manifest in JSON output so consumers can inspect
the capabilities and limitations used for a run.

## Common safeguards

- Parse failures become diagnostics instead of aborting the entire run.
- Unresolved and external edges remain explicit.
- Build metadata is parsed as data; build tools are not executed.
- File-size and repository limits apply before parser invocation.
- Cross-language edges require resolver evidence.

See [Capability matrix](CAPABILITY_MATRIX.md) for exact differences and
[Plugin development](PLUGIN_DEVELOPMENT.md) for the contract.
