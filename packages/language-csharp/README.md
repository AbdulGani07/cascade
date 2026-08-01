# `@cascade-code/language-csharp`

First-party structured C# analysis for `using` directives, namespaces/types, project references, and .NET solution metadata.

## Installation and use

Normal CLI users should not install it directly; the CLI loads it automatically for `.cs` files. Custom integrations can use its exported factory:

```bash
npm install @cascade-code/language-csharp@next
```

```ts
import { createCSharpPlugin } from "@cascade-code/language-csharp";
const plugin = createCSharpPlugin();
```

Exports include `CSharpLanguagePlugin`, `createCSharpPlugin`, and `extractCSharpDependencies`. Its documented capability level is **Structured**, including source, symbol, project/build, entry-point, test, and generated-file evidence.

## Environment, security, and limitations

Requires Node.js 22.13 or newer; it reads source and `.sln`/`.csproj` evidence without running MSBuild. Conditional properties, source generators, restore state, and runtime reflection can change the effective graph.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
