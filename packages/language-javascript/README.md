# `@cascade-code/language-javascript`

First-party structured JavaScript analysis for ESM imports/exports, CommonJS `require`, dynamic imports, symbols, and module resolution.

## Installation and use

Normal CLI users should not install it directly; the CLI loads it automatically for `.js`, `.jsx`, `.mjs`, and `.cjs`. Custom integrations can instantiate it or reuse its extractor:

```bash
npm install @cascade-code/language-javascript@next
```

```ts
import { createJavaScriptPlugin } from "@cascade-code/language-javascript";
const plugin = createJavaScriptPlugin();
```

Exports are `JavaScriptLanguagePlugin`, `createJavaScriptPlugin`, and `extractScriptDependencies`. Its documented capability level is **Structured** with file, module, symbol, build, and runtime-dynamic dependency evidence.

## Environment, security, and limitations

Requires Node.js 22.13 or newer and never executes analyzed JavaScript. Runtime-computed specifiers, bundler transforms, loader hooks, and environment-dependent exports may remain unresolved; TypeScript syntax is handled by the TypeScript plugin.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
