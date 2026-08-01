# `@cascade-code/language-expanded`

Provides Cascade's first-party adapters for PHP, Ruby, Swift, Dart, shell, PowerShell, Lua, R, Vue, Svelte, HTML, stylesheets, GraphQL, and optional SQL analysis.

## Installation and use

Normal CLI users should not install it directly; core loads these adapters automatically according to configuration. SQL is present but disabled by default. Custom integrations can select factories explicitly:

```bash
npm install @cascade-code/language-expanded@next
```

```ts
import { createPhpPlugin, createVuePlugin } from "@cascade-code/language-expanded";
const plugins = [createPhpPlugin(), createVuePlugin()];
```

Exports are factory functions for PHP, Ruby, Swift, Dart, Shell, PowerShell, Lua, R, Vue, Svelte, HTML, styles, GraphQL, and SQL. Capability levels vary: PHP/Ruby/Swift/Dart are **Syntax-aware**; shell/PowerShell/Lua/R are **Pattern-based**; Vue/Svelte are **Component**; HTML/GraphQL are **Document**; styles are **Asset**; SQL is **Optional**.

## Environment, security, and limitations

Requires Node.js 22.13 or newer and does not execute project code, preprocessors, loaders, package managers, or SQL. Dynamic paths, metaprogramming, generated output, framework/compiler transforms, and tool-specific loading conventions remain limited.

[Documentation](../../docs/README.md) · [Capability matrix](../../docs/CAPABILITY_MATRIX.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
