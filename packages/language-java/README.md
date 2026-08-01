# `@cascade-code/language-java`

First-party structured Java analysis for imports, packages, symbols, JPMS-related evidence, and Maven/Gradle project metadata.

## Installation and use

Normal CLI users should not install it directly; the CLI loads it automatically for `.java` files. Custom integrations can use:

```bash
npm install @cascade-code/language-java@next
```

```ts
import { createJavaPlugin } from "@cascade-code/language-java";
const plugin = createJavaPlugin();
```

Exports include `JavaLanguagePlugin`, `createJavaPlugin`, and `extractJavaDependencies`. Its documented capability level is **Structured**, including symbol, project/build, entry-point, test, and generated-file evidence.

## Environment, security, and limitations

Requires Node.js 22.13 or newer and does not execute Maven, Gradle, javac, annotation processors, or application code. Generated sources, annotation processing, build profiles, and reflection may not appear in the static graph.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
