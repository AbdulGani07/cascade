# Security model

Cascade treats analyzed repositories as hostile data. It is designed to extract static evidence without executing the repository’s source, package scripts, build tools, compiler plugins, or framework configuration.

## Threat boundaries

| Boundary              | Primary risks                                             | Mitigations                                                                  |
| --------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Repository traversal  | Traversal, symlink escape, enormous trees and files       | Canonical root checks, configurable symlink policy, file/repository limits   |
| Parsers and resolvers | Crashes, pathological syntax, ReDoS, resource exhaustion  | Bounded input, cancellation, timeouts, explicit diagnostics                  |
| Configuration         | Code execution, unsafe paths, malicious values            | Parse structured data, schema validation, reject unknown dangerous values    |
| Cache                 | Poisoning, corruption, stale results                      | Versioned formats, content/config/plugin validation, bounded storage         |
| Reports               | Secret, path, source, HTML, SARIF, and terminal injection | Relative paths, redaction, context-aware escaping, structured serialization  |
| Dashboard             | XSS, unsafe exposure, data disclosure                     | React text rendering, CSP, loopback binding, random token                    |
| GitHub Action         | Excess permissions, fork attacks, command injection       | Minimal permissions, immutable pins, argument arrays, validated paths        |
| Plugins               | Arbitrary code with host privileges, dependency confusion | Explicit trust boundary and reviewed packages                                |
| Git impact            | Hooks, external diff tools, hostile revisions             | Argument arrays, validated refs, hooks disabled, external diff/textconv off  |
| VS Code configuration | Workspace-controlled executable paths                     | Workspace Trust and restricted executable configurations                     |
| Benchmark archives    | Traversal, links, decompression bombs, oversized entries  | HTTPS allowlist, pinned commits, checksum cache, link rejection, hard limits |

## Repository inputs

Malicious filenames and dependency strings are data. Filesystem operations must stay within the permitted canonical root. Symlink following is configurable and safe by default; a symlink must never provide access outside the allowed root.

File-size, file-count, edge-count, traversal-depth, and analysis-time limits are configurable. Security-sensitive failures are explicit rather than silently returning a complete-looking result.

Build metadata is parsed as JSON, XML, TOML, or constrained text where possible. Cascade does not import repository JavaScript configuration to obtain analysis data.

Every resolved file must remain within the canonical analysis root. Initial
discovery, configuration loading, parser reads, plugin resolver results, and
editor queries enforce this boundary. Existing paths are canonicalized so a
symlink cannot bypass a lexical prefix check. Paths containing spaces, Unicode,
and parentheses are passed as argument-array elements and remain supported.

Git change-impact analysis necessarily asks the locally installed Git executable
to inspect repository metadata and materialize detached snapshots. Cascade sets
an empty `core.hooksPath` and disables external diff and text-conversion drivers.
It does not run repository package, build, test, compiler, or shell scripts.

## Reports and secrets

Reports use project-relative paths by default. Reporters escape user-controlled strings for their output context and redact recognized secrets. Reports do not intentionally include source bodies.

No redaction system can recognize every secret. Review artifacts before uploading them outside the repository’s existing trust boundary.

## Dashboard and CI

The dashboard binds to `127.0.0.1`, uses a random token and HTTP-only cookie, and sets restrictive response headers and timeouts. It is not a hosted multi-user service.

The editor service is a child process connected through private stdin/stdout
pipes. It does not listen on TCP and therefore has no network authentication or
CORS surface. Its trust boundary is the parent Cascade/VS Code process and the
current operating-system user.

The analyzer and editor service contain no outbound HTTP client. Dashboard fetches
are same-origin requests to the loopback server. The scheduled real-repository
benchmark is the explicit exception: it downloads pinned GitHub archives, never
executes their contents, and applies compressed, expanded, per-entry, and
file-count limits.

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
- The installed Node.js and Git executables, first-party dependencies, and the
  local operating system remain trusted computing base components.
- Users who explicitly configure `cascade.servicePath` or `cascade.cliPath` in a
  trusted VS Code workspace authorize that executable. Those settings are ignored
  in untrusted workspaces.
- The dashboard token protects against accidental local access, not a hostile
  process running as the same operating-system user.
- File checks reduce symlink and traversal risk but cannot eliminate every
  filesystem time-of-check/time-of-use race against a concurrently mutating local
  process with the same permissions.

Cascade is not claimed to be fully secure. Report vulnerabilities privately using the repository [security policy](../SECURITY.md).
