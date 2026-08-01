# `@cascade-code/language-kotlin`

First-party structured Kotlin analysis for imports, packages, symbols, and Gradle/Android/multiplatform project evidence.

## Installation and use

Normal CLI users should not install it directly; the CLI loads it automatically for `.kt` and `.kts` files. Custom integrations can instantiate it:

```bash
npm install @cascade-code/language-kotlin@next
```

```ts
import { createKotlinPlugin } from "@cascade-code/language-kotlin";
const plugin = createKotlinPlugin();
```

Exports include `KotlinLanguagePlugin`, `createKotlinPlugin`, and `extractKotlinDependencies`. Its documented capability level is **Structured**, including symbol, build, test, and generated-file evidence.

## Environment, security, and limitations

Requires Node.js 22.13 or newer and does not execute Gradle, the Kotlin compiler, or compiler plugins. Generated sources, multiplatform source-set selection, compiler plugins, and runtime reflection can alter the effective graph.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
