# JSON schema

Cascade’s configuration schema is:

```text
packages/core/config.schema.json
```

Reference it from `cascade.config.json`:

```json
{
  "$schema": "./packages/core/config.schema.json",
  "root": ".",
  "include": ["src/**"],
  "exclude": ["**/dist/**"],
  "limits": {
    "maxFiles": 10000,
    "maxFileSizeBytes": 2097152
  }
}
```

Then validate:

```bash
node packages/cli/dist/index.js config validate
```

## Validation behavior

The schema defines accepted shapes and enumerated values. Security-sensitive configuration is also checked at runtime because filesystem boundaries and resolved paths cannot be validated by JSON Schema alone.

Unknown or unsafe values should fail explicitly. Do not suppress a validation failure in CI without understanding which configuration was rejected.

## Editor integration

Editors that understand JSON Schema can provide completion and diagnostics when the `$schema` path resolves from the configuration file.

## Compatibility

Schema changes follow the project’s [release policy](RELEASE_POLICY.md). Consumers should pin a Cascade version when configuration compatibility is critical.
