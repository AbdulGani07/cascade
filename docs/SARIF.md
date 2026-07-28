# SARIF output

Cascade can serialize diff and governance findings as SARIF for systems that support the Static Analysis Results Interchange Format.

## Generate a report

```bash
node packages/cli/dist/index.js risk \
  --base origin/main \
  --head HEAD \
  --format sarif \
  --output cascade-risk.sarif
```

Architecture findings:

```bash
node packages/cli/dist/index.js governance \
  --format sarif \
  --output cascade-governance.sarif
```

## Safety

SARIF fields are serialized as data. User-controlled paths, messages, symbols, and rule text must not be interpolated into executable shell or workflow syntax. Cascade uses project-relative paths by default and redacts recognized secrets from reports.

Treat SARIF produced from a malicious repository as untrusted input. Upload it only to a service you intend to receive repository metadata.

## Limits

SARIF expresses findings and locations; it does not preserve every graph detail. Use JSON output when an integration needs complete Cascade-specific structures.
