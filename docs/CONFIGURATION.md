# Configuration

Cascade reads `cascade.config.json` from the analyzed root. The file must be
JSON, no larger than 1 MiB, and inside that root. Unknown top-level and
prototype-sensitive keys are rejected.

## Starter configuration

```json
{
  "entryPoints": ["src/index.ts"],
  "ignore": ["**/node_modules/**", "**/dist/**"],
  "selectedProjects": [],
  "symlinks": "ignore",
  "maxFiles": 100000,
  "maxFileSizeBytes": 5242880,
  "maxTotalBytes": 1073741824,
  "architectureGovernance": {
    "version": "1",
    "rules": []
  }
}
```

Create and validate it:

```bash
node packages/cli/dist/index.js init .
node packages/cli/dist/index.js config validate .
```

## File and parser settings

| Key                   | Type       | Purpose                                    |
| --------------------- | ---------- | ------------------------------------------ |
| `entryPoints`         | `string[]` | Explicit analysis roots                    |
| `ignore`              | `string[]` | Minimatch ignore patterns                  |
| `extensions`          | `string[]` | Included extensions beyond plugin matching |
| `respectGitignore`    | `boolean`  | Read `.gitignore`; default `true`          |
| `assetExtensions`     | `string[]` | Non-code asset candidates                  |
| `includeNonCodeEdges` | `boolean`  | Include supported asset/config edges       |
| `analyzeNotebooks`    | `boolean`  | Python notebook option; default `false`    |
| `pythonSourceRoots`   | `string[]` | Additional Python import roots             |

## Resolution settings

| Key                       | Type       | Purpose                             |
| ------------------------- | ---------- | ----------------------------------- |
| `pathAliases`             | object     | Static specifier-to-path aliases    |
| `conditions`              | `string[]` | Package export conditions           |
| `caseSensitiveResolution` | `boolean`  | Override platform default           |
| `maxDepth`                | number     | Optional configured traversal depth |

```json
{
  "pathAliases": {
    "@app/*": "src/*"
  },
  "conditions": ["types", "import", "node", "default"],
  "caseSensitiveResolution": true
}
```

## Plugin settings

```json
{
  "plugins": [
    {
      "id": "cascade-language-typescript",
      "enabled": true,
      "priority": 100,
      "options": {}
    }
  ]
}
```

Higher priority wins when multiple enabled plugins match a file.

## Project selection

```json
{
  "selectedProjects": ["packages/api"],
  "projectOverrides": {
    "packages/legacy": { "ignore": true },
    "packages/core": { "name": "Core domain", "projectType": "package" }
  }
}
```

Overrides only apply to detected project IDs. Unmatched IDs produce diagnostics.

## Security and resource limits

| Key                |      Default |
| ------------------ | -----------: |
| `symlinks`         |   `"ignore"` |
| `maxFiles`         |     `100000` |
| `maxFileSizeBytes` |    `5242880` |
| `maxTotalBytes`    | `1073741824` |

`symlinks: "internal"` follows directory symlinks only when their canonical
target remains inside the root. Raising limits increases resource-exhaustion
exposure.

## Git impact

`gitImpact` accepts `riskWeights`, `testMappings`, `coverageMap`,
`criticalPaths`, and lightweight `architectureRules`. The full versioned policy
engine uses `architectureGovernance`; see [Architecture rules](ARCHITECTURE_RULES.md).

## Environment overrides

- `CASCADE_CONFIG_PATH`: explicit config path; it must remain inside the root
- `CASCADE_SELECTED_PROJECTS`: comma-separated project IDs
- `CASCADE_CACHE_DIR`: CLI cache-management location

The core currently has no persistent analysis cache.
