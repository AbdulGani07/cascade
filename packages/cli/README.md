# `@cascade-code/cli`

Cascade's primary user-facing package for local dependency graphs, change-impact analysis, cycle detection, architecture governance, affected-test identification, and dashboard reports.

## Should I install it directly?

Yes. This is the recommended package for normal Cascade users; the library and language packages are primarily extension points used by the CLI.

```bash
npm install --global @cascade-code/cli@next
```

## Usage

```bash
cascade analyze .
cascade diff . --base main --head HEAD --format markdown
cascade affected-tests . --base main --head HEAD
cascade governance .
cascade dashboard . --no-open
```

Run `cascade --help` or `cascade <command> --help` for the complete option set. The CLI is responsible for analysis, graph/project views, Git-based impact commands, governance checks, configuration diagnostics, and the bundled local dashboard.

## Environment and privacy

Requires Node.js 22.13 or newer. Analysis runs locally and does not intentionally upload source code; dashboard output is intended for local use and should not be exposed as a hosted service without separate authentication and transport controls.

## Limitations

Results are static evidence, not proof of runtime behavior or safe refactoring. Dynamic loading, generated code, compiler transformations, unresolved imports, and language-specific limits can make a graph incomplete.

[Documentation](../../docs/README.md) · [CLI reference](../../docs/CLI.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
