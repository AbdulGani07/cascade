# Rust language support

Updated: 2026-07-28 14:00 +06:00

Cascade 2.3.0 provides first-party Rust dependency analysis through
`@cascade/language-rust`. The plugin parses source with `tree-sitter-rust` and
uses Cargo manifests as structured build evidence. It is not a regular-expression
scanner and does not claim to reproduce rustc name resolution or macro expansion.

## Analysis levels

| Level                      | Support                                                                       |
| -------------------------- | ----------------------------------------------------------------------------- |
| File dependency            | Supported for module declarations and literal include macros                  |
| Module dependency          | Supported for `use`, `extern crate`, crate roots, and workspace crates        |
| Symbol dependency          | Partial: declarations and import paths, without rustc type resolution         |
| Build dependency           | Supported for Cargo packages, dependencies, and workspaces                    |
| Runtime dynamic dependency | Detection only for non-literal include paths; runtime loading is not resolved |

## Capability matrix

| Capability                                   | Status                             | Evidence                                                   |
| -------------------------------------------- | ---------------------------------- | ---------------------------------------------------------- |
| `.rs` structured parsing                     | Supported                          | Tree-sitter Rust syntax tree                               |
| `use` paths and aliases                      | Supported                          | `use_declaration` nodes                                    |
| Public re-exports and glob imports           | Supported, glob confidence reduced | Syntax-tree node and source evidence                       |
| `extern crate`                               | Supported                          | `extern_crate_declaration` nodes                           |
| Out-of-line `mod` declarations               | Supported                          | `mod_item` nodes                                           |
| `include!`, `include_str!`, `include_bytes!` | Literal paths supported            | Macro syntax-tree nodes                                    |
| Cargo packages and dependencies              | Supported                          | `Cargo.toml` sections                                      |
| Cargo workspaces                             | Supported                          | Workspace member metadata                                  |
| Local module resolution                      | Supported                          | Rust 2018 `crate`, `self`, and `super` file conventions    |
| Workspace crate resolution                   | Supported                          | Package names and crate roots                              |
| Standard-library crates                      | Supported                          | `std`, `core`, `alloc`, `proc_macro`, and `test`           |
| Binary entry points                          | Supported                          | `src/main.rs`, `src/bin/*.rs`, and parsed `main` functions |
| Integration tests and benches                | Supported                          | Cargo directory conventions                                |
| Generated sources                            | Supported                          | `target`, generated/vendor folders, and generated headers  |
| Malformed files                              | Supported                          | Partial parse plus source locations and diagnostics        |
| Confidence and evidence                      | Supported                          | Stored on extraction and resolution results                |

## Cargo and cross-project behavior

Cargo package names are normalized from hyphens to Rust crate-name underscores.
Workspace packages resolve to `src/lib.rs` or `src/main.rs`. Dependencies declared
in normal, development, build, or target-specific dependency tables are classified
as external if no workspace package matches. Cross-project edges are created only
when package metadata and an existing crate root provide evidence.

The scanner does not invent native-library, generated-client, or build-script
edges. Relationships produced by `build.rs` remain diagnostics or limitations
unless a literal file dependency exists in source.

## Known limitations

- `cfg` and `cfg_attr` are not evaluated without a target triple and Cargo feature set.
- Declarative and procedural macros are not expanded.
- rustc type inference, trait selection, and post-expansion semantic name resolution are unavailable.
- `build.rs` output, linker directives, and generated files outside the scan are not inferred.
- Non-literal include paths and runtime library loading cannot be resolved statically.
- Glob imports create module-level edges but do not claim complete symbol ownership.

## Configuration example

```json
{
  "extensions": [".rs"],
  "ignore": ["**/target/**", "**/vendor/**", "**/generated/**"]
}
```

## Benchmark

Run after building the plugin:

```powershell
pnpm --filter '@cascade/language-rust' benchmark
```

Paths containing parentheses or special characters should remain quoted in
PowerShell commands.
