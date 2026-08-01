# `@cascade-code/language-c`

First-party structured C analysis for preprocessor includes, declarations, native project metadata, and file-level resolution.

## Installation and use

Normal CLI users should not install this package directly: `@cascade-code/core`, and therefore the CLI, loads it automatically for `.c` and `.h` files. Plugin authors can install and instantiate it explicitly:

```bash
npm install @cascade-code/language-c@next
```

```ts
import { createCPlugin } from "@cascade-code/language-c";
const plugin = createCPlugin();
```

Exports include `CLanguagePlugin`, `createCPlugin`, `extractCDependencies`, and `resolveNativeInclude`. Its documented capability level is **Structured**, with file, symbol, and build-dependency evidence.

## Environment, security, and limitations

Requires Node.js 22.13 or newer and analyzes source locally without invoking a compiler. Preprocessor conditions, generated headers, compiler include paths, and full macro semantics are not evaluated, so effective build graphs can differ.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
