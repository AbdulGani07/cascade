# `@cascade-code/language-cpp`

First-party structured C++ analysis for includes, declarations, and native build/project relationships.

## Installation and use

Normal CLI users should not install it directly; the CLI loads it automatically for C++ source and header extensions. Custom integrations can install the factory:

```bash
npm install @cascade-code/language-cpp@next
```

```ts
import { createCppPlugin } from "@cascade-code/language-cpp";
const plugin = createCppPlugin();
```

Exports are `CppLanguagePlugin` and `createCppPlugin`. Its documented capability level is **Structured**, providing file, symbol, and build-dependency evidence.

## Environment, security, and limitations

Requires Node.js 22.13 or newer and does not execute compilers or build tools. Templates, C++ modules, preprocessor branches, generated headers, and compile-command-specific include paths are not fully modeled.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
