# Architecture rules

Architecture rules let a repository declare dependency boundaries and evaluate them against the extracted graph.

## Configuration

```json
{
  "$schema": "./packages/core/config.schema.json",
  "architecture": {
    "layers": [
      { "name": "ui", "patterns": ["apps/web/src/**"] },
      { "name": "domain", "patterns": ["packages/domain/src/**"] },
      { "name": "data", "patterns": ["packages/data/src/**"] }
    ],
    "rules": [
      {
        "from": "domain",
        "disallow": ["ui"],
        "message": "Domain code must not depend on UI code."
      },
      {
        "from": "ui",
        "allow": ["domain"]
      }
    ]
  }
}
```

Validate configuration before analysis:

```bash
node packages/cli/dist/index.js config validate
```

Evaluate rules:

```bash
node packages/cli/dist/index.js governance
node packages/cli/dist/index.js governance --format sarif
```

## Matching

Layers classify files with configured glob patterns. Rules apply to graph edges crossing those classifications. Keep patterns narrow enough that each architectural area has an unambiguous purpose.

## Policy guidance

- Begin in reporting mode and inspect false positives.
- Document intentional exceptions in repository policy.
- Prefer stable architectural boundaries over folder-by-folder micromanagement.
- Treat unresolved dependencies as missing evidence, not compliant edges.
- Review policy changes like source-code changes.

## Example policy

The example above permits UI code to use domain code and prevents domain code from reaching back into UI code. It does not establish runtime isolation or authorization boundaries.

## Limits

Rules operate on relationships Cascade can extract and resolve. They do not replace compiler visibility, package exports, runtime sandboxing, or security controls.
