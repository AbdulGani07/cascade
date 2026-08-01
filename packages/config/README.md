# `@cascade-code/config`

Loads, validates, and supplies defaults for Cascade's `cascade.config.json` configuration.

## Should I install it directly?

Usually no. The CLI and core engine use it automatically; install it when building a custom Cascade integration that needs the typed configuration API.

```bash
npm install @cascade-code/config@next
```

## Usage

```ts
import { loadCascadeConfig } from "@cascade-code/config";

const config = loadCascadeConfig(process.cwd());
console.log(config.entryPoints);
```

Minimal `cascade.config.json`:

```json
{
  "entryPoints": ["src/index.ts"],
  "ignore": ["**/dist/**"],
  "extensions": [".ts", ".tsx"],
  "plugins": [{ "id": "cascade-language-typescript", "enabled": true }]
}
```

Main exports are `CascadeConfig`, `PluginConfigSetting`, `defaultConfig`, and `loadCascadeConfig`. Configuration loading rejects unknown or prototype-related keys, enforces resource bounds, and requires an override path to remain inside the analyzed project.

## Environment and limitations

Requires Node.js 22.13 or newer. The loader reads local JSON; it does not execute project configuration. Static configuration cannot model every build-time or runtime condition.

[Documentation](../../docs/README.md) · [Configuration reference](../../docs/CONFIGURATION.md) · [Repository](https://github.com/AbdulGani07/cascade) · [Issues](https://github.com/AbdulGani07/cascade/issues) · [License](../../LICENSE)
