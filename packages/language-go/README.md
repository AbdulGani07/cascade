# `@cascade-code/language-go`

First-party structured Go analysis for imports, packages, symbols, module/workspace metadata, entry points, tests, and generated files.

## Installation and use

Normal CLI users should not install it directly; the CLI loads it automatically for `.go` files and Go metadata. Custom integrations can instantiate it:

```bash
npm install @cascade-code/language-go@next
```

```ts
import { createGoPlugin } from "@cascade-code/language-go";
const plugin = createGoPlugin();
```

Exports include `GoLanguagePlugin`, `createGoPlugin`, and `extractGoDependencies`. Its documented capability level is **Structured**. It uses `go.mod`, `go.work`, module paths, workspace modules, and local `replace` directives without invoking the network or mutating a module cache.

## Environment, security, and limitations

Requires Node.js 22.13 or newer and analyzes files locally without running the Go toolchain. Build tags, generated code, cgo/toolchain behavior, and runtime plugin loading can change the effective graph.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
