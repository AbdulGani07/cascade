# Examples

These examples use fixtures committed to the Cascade repository, so the commands can be copied after a source build.

## TypeScript application

```bash
node packages/cli/dist/index.js analyze test-project
node packages/cli/dist/index.js graph test-project --json
```

## Python application

```bash
node packages/cli/dist/index.js analyze tests/fixtures/python/src-layout
```

The fixture exercises a `src/` layout and Python import extraction.

## Java service

```bash
node packages/cli/dist/index.js projects tests/fixtures/jvm/maven-multi
node packages/cli/dist/index.js analyze tests/fixtures/jvm/maven-multi
```

## .NET solution

```bash
node packages/cli/dist/index.js projects tests/fixtures/csharp/dotnet-solution
node packages/cli/dist/index.js analyze tests/fixtures/csharp/dotnet-solution
```

## Go module

```bash
node packages/cli/dist/index.js projects tests/fixtures/go/module
node packages/cli/dist/index.js analyze tests/fixtures/go/module
```

## Rust workspace

```bash
node packages/cli/dist/index.js projects tests/fixtures/rust/workspace
node packages/cli/dist/index.js analyze tests/fixtures/rust/workspace
```

## Polyglot monorepo

```bash
node packages/cli/dist/index.js projects tests/fixtures/polyglot-monorepo
node packages/cli/dist/index.js analyze tests/fixtures/polyglot-monorepo
node packages/cli/dist/index.js dashboard tests/fixtures/polyglot-monorepo
```

## Interpreting results

Detection confirms that a project shape or file type was recognized. Dependency precision still depends on the relevant language plugin’s capability. Compare the result with the [capability matrix](CAPABILITY_MATRIX.md), especially when an example contains generated code or ecosystem-specific resolution.
