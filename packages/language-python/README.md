# `@cascade-code/language-python`

First-party syntax-aware Python analysis for import statements, relative/package resolution, symbols, and common project/framework layouts.

## Installation and use

Normal CLI users should not install it directly; the CLI loads it automatically for `.py` and `.pyi` files. Custom integrations can use:

```bash
npm install @cascade-code/language-python@next
```

```ts
import { createPythonPlugin } from "@cascade-code/language-python";
const plugin = createPythonPlugin();
```

Exports include `PythonLanguagePlugin`, `createPythonPlugin`, and `extractPythonDependencies`. Its documented capability level is **Syntax-aware**, with limited symbol evidence and support for source layouts, package metadata, entry points, tests, and generated files.

## Environment, security, and limitations

Requires Node.js 22.13 or newer and does not import modules or run Python. Dynamic imports, `sys.path` mutation, namespace/package ambiguity, decorators, and runtime framework registration can reduce resolution coverage.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
