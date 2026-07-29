# `@cascade-code/language-go`

First-party Go analysis for Cascade.

## Strategy

Source files are parsed with the `tree-sitter-go` grammar. Imports, package clauses,
declarations, and `main` functions come from syntax-tree nodes rather than regular
expressions. `go.mod` and `go.work` remain authoritative structured build metadata:
module paths, workspace modules, and local `replace` directives are used during
resolution without invoking the network or mutating a module cache.

See the [language capability matrix](../../docs/CAPABILITY_MATRIX.md) for capability and
explicit limitations.
