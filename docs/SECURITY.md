# Security model

Cascade treats analyzed repositories as hostile data. It is designed to extract static evidence without executing the repository’s source, package scripts, build tools, compiler plugins, or framework configuration.

## Threat boundaries

| Boundary              | Primary risks                                             | Mitigations                                                                 |
| --------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| Repository traversal  | Traversal, symlink escape, enormous trees and files       | Canonical root checks, configurable symlink policy, file/repository limits  |
| Parsers and resolvers | Crashes, pathological syntax, ReDoS, resource exhaustion  | Bounded input, cancellation, timeouts, explicit diagnostics                 |
| Configuration         | Code execution, unsafe paths, malicious values            | Parse structured data, schema validation, reject unknown dangerous values   |
| Cache                 | Poisoning, corruption, stale results                      | Versioned formats, content/config/plugin validation, bounded storage        |
| Reports               | Secret, path, source, HTML, SARIF, and terminal injection | Relative paths, redaction, context-aware escaping, structured serialization |
| Dashboard             | XSS, unsafe exposure, data disclosure                     | React text rendering, CSP, loopback binding, random token                   |
| GitHub Action         | Excess permissions, fork attacks, command injection       | Minimal permissions, immutable pins, argument arrays, validated paths       |
| Plugins               | Arbitrary code with host privileges, dependency confusion | Explicit trust boundary and reviewed packages                               |

## Repository inputs

Malicious filenames and dependency strings are data. Filesystem operations must stay within the permitted canonical root. Symlink following is configurable and safe by default; a symlink must never provide access outside the allowed root.

File-size, file-count, edge-count, traversal-depth, and analysis-time limits are configurable. Security-sensitive failures are explicit rather than silently returning a complete-looking result.

Build metadata is parsed as JSON, XML, TOML, or constrained text where possible. Cascade does not import repository JavaScript configuration to obtain analysis data.

## Reports and secrets

Reports use project-relative paths by default. Reporters escape user-controlled strings for their output context and redact recognized secrets. Reports do not intentionally include source bodies.

No redaction system can recognize every secret. Review artifacts before uploading them outside the repository’s existing trust boundary.

## Dashboard and CI

The dashboard binds to `127.0.0.1`, uses a random token and HTTP-only cookie, and sets restrictive response headers and timeouts. It is not a hosted multi-user service.

Use `contents: read` in GitHub Actions unless SARIF upload requires `security-events: write`. Prefer `pull_request` for forks, avoid privileged execution of untrusted checkouts, and pin actions to immutable commits.

## Plugin trust

Third-party plugins execute in the Cascade process with the user’s filesystem and process privileges. Plugin packages are not a sandbox. Only install reviewed plugins from trusted publishers and pin versions.

## Residual risks

- A parser or dependency can contain an unknown vulnerability.
- A pathological input may consume resources before cooperative cancellation occurs.
- A trusted plugin can access data available to the Cascade process.
- Static analysis may miss dynamically constructed dependencies.
- Redaction may miss novel secret formats.
- A user can deliberately configure wider access or higher resource limits.

Cascade is not claimed to be fully secure. Report vulnerabilities privately using the repository [security policy](../SECURITY.md).
