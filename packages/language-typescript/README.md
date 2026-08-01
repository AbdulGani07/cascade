# `@cascade-code/language-typescript`

First-party structured TypeScript analysis for JavaScript dependency forms plus type-only imports/re-exports and TypeScript source conventions.

## Installation and use

Normal CLI users should not install it directly; the CLI loads it automatically for `.ts`, `.tsx`, `.mts`, and `.cts`. Custom integrations can instantiate it:

```bash
npm install @cascade-code/language-typescript@next
```

```ts
import { createTypeScriptPlugin } from "@cascade-code/language-typescript";
const plugin = createTypeScriptPlugin();
```

Exports are `TypeScriptLanguagePlugin` and `createTypeScriptPlugin`. Its documented capability level is **Structured**, with file, module, symbol, build, runtime-dynamic, entry-point, test, and generated-file evidence.

## Environment, security, and limitations

Requires Node.js 22.13 or newer and does not execute source or perform full TypeScript type checking. Compiler-option-dependent resolution, type-only re-exports, transforms, generated declarations, and runtime-computed imports can make results incomplete.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
