# Go language support

Cascade's first-party Go plugin uses `tree-sitter-go` for deterministic, error-tolerant
source parsing. It does not use a regular-expression-only source scanner. Go build
metadata is read locally from `go.mod` and `go.work`; analysis never downloads modules
or changes the user's module cache.

## Capability matrix

| Area             | Behavior                                         | Status                             |
| ---------------- | ------------------------------------------------ | ---------------------------------- |
| Files            | `.go` source                                     | Supported                          |
| Syntax           | Package clauses and declarations                 | Tree-sitter                        |
| Imports          | Single and grouped imports                       | Supported                          |
| Imports          | Aliases, dot imports, blank imports              | Supported                          |
| Imports          | cgo pseudo-package `C`                           | Identified as an external cgo edge |
| Modules          | `go.mod` module paths                            | Supported                          |
| Workspaces       | Multiple modules below a repository or `go.work` | Supported                          |
| Replacements     | Local-path `replace` directives                  | Supported                          |
| Replacements     | Version or remote replacements                   | External; not downloaded           |
| Packages         | Workspace and module-local package lookup        | Supported                          |
| Packages         | `internal` visibility                            | Enforced with diagnostics          |
| Standard library | Standard package classification                  | Supported                          |
| Third party      | Canonical remote import classification           | Supported                          |
| Entry points     | `package main` plus `func main()`                | Supported                          |
| Tests            | `_test.go` files                                 | Supported                          |
| Generated        | Canonical `Code generated … DO NOT EDIT.` header | Supported                          |
| Generated        | `vendor`, `generated`, and `gen` directories     | Supported                          |
| Constraints      | `//go:build` and legacy `// +build`              | Recorded as evidence               |
| Diagnostics      | Malformed syntax                                 | Tree-sitter error/missing nodes    |
| Diagnostics      | Missing packages and internal visibility         | Supported                          |
| Confidence       | Per-edge confidence and evidence                 | Supported                          |

## Resolution model

An import matching a discovered module path resolves to a package directory, represented
in Cascade's file graph by the first non-test Go file in that directory. Local filesystem
`replace` directives can connect different modules in the same repository. Standard
packages and canonical remote paths remain external. A non-standard import without a
workspace/module match is unresolved rather than silently treated as resolved.

`go.work` is detected as workspace metadata. Its modules are found through the same
repository-wide module discovery used for multi-module repositories, so analysis is
read-only and works even when the `go` executable is unavailable.

## Cross-language evidence

The plugin identifies cgo through the compiler-defined `import "C"` pseudo-package.
It does not infer a specific C file or library because the preamble and platform linker
configuration may select different native targets. Generated Go clients are recognized
as generated source. Cross-language edges should only be added by Cascade's shared build
metadata layer when an explicit generator input, project reference, or native linker
relationship provides evidence.

## Known limitations

- Build constraints are preserved but not evaluated because results depend on `GOOS`,
  `GOARCH`, release tags, cgo state, and user tags.
- Remote module versions, vendored module manifests, and the module cache are not
  downloaded or inspected by the plugin.
- An imported package maps to a representative file; Go compilation operates at package
  granularity, while Cascade's current graph nodes are file-based.
- Compiler-generated dependencies and runtime `plugin.Open` symbol loading are not
  statically resolved.
- cgo is identified, but C header and linker flag expansion is deliberately left to a
  build-aware native-language integration.

## Fixtures and tests

Fixtures cover a normal Go module, command entry point, tests, generated sources, build
constraints, cgo, malformed source, internal packages, a `go.work` workspace, and a
local `replace` relationship. Unit tests validate AST extraction, diagnostics, detection,
module/workspace resolution, dependency classification, and entry-point discovery.

The package benchmark parses synthetic grouped-import files using the production
Tree-sitter extraction path:

| Imports | Extracted edges |      Time |
| ------: | --------------: | --------: |
|     100 |             100 |  19.14 ms |
|   1,000 |           1,000 |  83.58 ms |
|   5,000 |           5,000 | 196.03 ms |

Results were recorded on 2026-07-28 on the development machine and are comparative,
not a cross-machine SLA. Parser work scales approximately linearly in syntax-tree size.
The shared graph builder should cache module indexes once per analysis run.
