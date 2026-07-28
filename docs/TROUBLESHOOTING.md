# Troubleshooting

## The CLI entry point does not exist

Build the repository first:

```bash
pnpm install --frozen-lockfile
pnpm run build
node packages/cli/dist/index.js --help
```

## Dashboard assets not found

Run `pnpm run build` from the repository root. The CLI requires the dashboard distribution before it can serve the UI.

## A Git comparison cannot find the base revision

The clone may be shallow. Fetch the base branch or SHA, then rerun with explicit refs:

```bash
git fetch origin main
node packages/cli/dist/index.js risk --base origin/main --head HEAD
```

## Dependencies are unresolved

Check:

- the file type’s [capability level](CAPABILITY_MATRIX.md);
- project manifests and workspace roots;
- path aliases and language-specific configuration;
- excluded or oversized files;
- generated files not present in the checkout.

Unresolved dependencies are explicit because guessing an edge would provide misleading evidence.

## Configuration is rejected

```bash
node packages/cli/dist/index.js config validate
```

Compare the file with [Configuration](CONFIGURATION.md) and the [JSON schema](JSON_SCHEMA.md). Unknown security-sensitive values are rejected.

## Analysis stops at a limit

Increase only the relevant configurable limit after reviewing repository size and available memory. Limits protect the process from malicious or accidental resource exhaustion.

## Cache problems

```bash
node packages/cli/dist/index.js cache path
node packages/cli/dist/index.js cache clear --yes
```

Cascade validates cache metadata and content identity before reuse. Corrupt or incompatible entries are rejected; clearing the cache forces recomputation.

## More diagnostics

```bash
node packages/cli/dist/index.js doctor
node packages/cli/dist/index.js analyze . --verbose
```

When filing a bug, remove secrets and proprietary paths from logs and include the Cascade version, operating system, Node.js version, configuration, and a minimal reproduction.
