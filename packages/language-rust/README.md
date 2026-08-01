# `@cascade-code/language-rust`

First-party structured Rust analysis for modules, `use`, crate/include forms, symbols, and Cargo package/workspace evidence.

## Installation and use

Normal CLI users should not install it directly; the CLI loads it automatically for `.rs` files and Cargo metadata. Custom integrations can instantiate it:

```bash
npm install @cascade-code/language-rust@next
```

```ts
import { createRustPlugin } from "@cascade-code/language-rust";
const plugin = createRustPlugin();
```

Exports include `RustLanguagePlugin`, `createRustPlugin`, and `extractRustDependencies`. Its documented capability level is **Structured**, with file, module, symbol, build, and runtime-dynamic dependency evidence.

## Environment, security, and limitations

Requires Node.js 22.13 or newer and does not invoke Cargo, rustc, procedural macros, or build scripts. `cfg` selection, macro expansion, generated sources, target selection, and non-literal include paths can change the compiled graph.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
