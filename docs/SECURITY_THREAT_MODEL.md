# Security threat model

## Scope and assets

This review covers the static-analysis core, language plugins, CLI, loopback
dashboard, reporters and SARIF, composite GitHub Action, editor service, and
VS Code extension. Protected assets include source code, credentials, files
outside the selected repository, workstation availability, CI tokens, report
integrity, and developer trust in findings.

The analyzed repository, its filenames, symlinks, Git history, manifests,
configuration, import strings, and source contents are untrusted. CLI options,
Action inputs, editor protocol messages, and installed third-party plugins cross
separate trust boundaries.

## Threats and mitigations

| Threat                                      | Mitigation                                                                                                                                                                                                                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Malicious repositories and filenames        | Canonical-root containment, control-character-safe JSON output, configurable count/byte limits, parser exception isolation, and explicit resource/security errors.                                                                                                                                |
| Symlinks and path traversal                 | Symlinks are ignored by default. `symlinks: "internal"` follows only canonical targets inside the root. Configuration files and editor file queries must remain inside their workspace.                                                                                                           |
| Command and shell injection                 | Git uses `execFileSync` with argument arrays and no shell. Git revisions reject leading options, whitespace, controls, and excessive length. Extension processes use argument arrays with `shell: false` by default.                                                                              |
| Repository code execution                   | Cascade does not import repository modules or invoke build/package tools. JSON, TOML-like, XML-like, Gradle, CMake, and other build metadata are parsed as data/text. Package lifecycle scripts are disabled in the Action install.                                                               |
| Prototype pollution                         | Configuration recursively rejects `__proto__`, `prototype`, and `constructor`, and rejects unknown top-level keys. Report normalization drops prototype-sensitive keys.                                                                                                                           |
| ReDoS and parser crashes                    | Regexes are bounded by configurable file size. Plugin calls are exception-isolated. Analysis supports cancellation and wall-clock deadlines between files/imports; the IDE additionally terminates its worker on cancellation.                                                                    |
| Zip bombs and enormous repositories         | Cascade does not unpack archives. `maxFileSizeBytes`, `maxFiles`, and `maxTotalBytes` are enforced before parsing. Defaults are 5 MiB/file, 100,000 files, and 1 GiB total included bytes.                                                                                                        |
| Dependency confusion and malicious packages | Analysis never installs repository dependencies. The Action installs Cascade's pinned lockfile with `--ignore-scripts`. CI performs a production dependency audit and dependency review. Lockfile changes require review.                                                                         |
| XSS and unsafe dashboard rendering          | React escapes text by default; no `dangerouslySetInnerHTML` path is used. The server is loopback-only, uses a random HttpOnly SameSite token, CSP, no-store, MIME sniffing protection, frame denial, and request timeouts.                                                                        |
| Source and absolute-path leakage            | The dashboard no longer writes `analysis.json` into the repository. Core and reporter JSON use `.` as project root and project-relative node paths. Reports redact common token, API-key, password, AWS-key, and private-key forms.                                                               |
| Malicious configuration                     | JSON only; maximum 1 MiB; must be inside the project; unknown top-level and prototype-sensitive keys are rejected; enumerations and resource limits are range checked.                                                                                                                            |
| Malicious plugins                           | First-party plugins are trusted application code. Third-party plugins are fully trusted code in-process; manifests and capability wrappers do not sandbox them. This boundary is prominently documented.                                                                                          |
| Resource exhaustion                         | Repository limits, structural impact mode, iterative graph algorithms, bounded editor caches/traversal, worker cancellation, HTTP timeouts, and Action timeout controls constrain common exhaustion paths.                                                                                        |
| Cache poisoning                             | Core has no persistent analysis cache. Request-local caches are discarded with the process and editor query caches are bounded and cleared after saved changes. A future disk cache must be versioned, content/config/plugin hashed, checksummed, atomic, bounded, and fail closed on corruption. |
| SARIF/report injection                      | Reports serialize structured JSON, URI-encode SARIF artifact paths, remove absolute paths and controls, escape Markdown code delimiters, and redact likely secrets.                                                                                                                               |
| GitHub Actions and forks                    | Workflows declare minimal permissions. Fork PRs do not upload SARIF. Actions are pinned where existing immutable SHAs are available; dependency, secret, and CodeQL scanning run separately.                                                                                                      |

## Configuration example

```json
{
  "symlinks": "ignore",
  "maxFiles": 100000,
  "maxFileSizeBytes": 5242880,
  "maxTotalBytes": 1073741824
}
```

Security limit failures use explicit `RESOURCE_LIMIT`, `SECURITY_PATH_ESCAPE`,
or `SECURITY_FILE_READ` prefixes. Raising limits increases denial-of-service
exposure. Following internal symlinks can scan the same content through several
paths and should be enabled only when required.

## Unavoidable execution

Repository code execution is not required and there is no opt-in execution mode.
Git itself is invoked for change-impact snapshots, using argument arrays. The
dashboard uses the operating system's URL opener. The VS Code extension launches
the configured Cascade executable; configuring `cascade.cliPath` or
`cascade.servicePath` grants that executable the extension host's permissions.

## Residual risks

- Native Tree-sitter grammars and third-party language plugins process hostile
  bytes in-process. A memory-safety bug in native code or a malicious plugin can
  escape all application-level controls.
- Cancellation is cooperative and cannot interrupt one synchronous parser or
  pathological regex invocation; the IDE worker provides a stronger kill
  boundary than the synchronous CLI.
- Secret redaction is heuristic. Novel, encoded, fragmented, or filename-based
  secrets may still appear in reports. Do not publish reports from sensitive
  repositories without review.
- Loopback services can still be reached by other local processes. The random
  session token reduces browser-origin attacks but is not operating-system
  authentication.
- Git consumes repository-controlled objects and history. Git vulnerabilities,
  extremely large histories, and filesystem races remain upstream risks.
- Dependency and secret scanners can have false negatives, false positives, or
  availability failures. Action tags not pinned to immutable commits remain a
  supply-chain review item.
- File-size limits reduce but do not prove freedom from ReDoS or algorithmic
  denial of service. Polyglot parsers have different complexity profiles.

This threat model documents current controls; it does not claim Cascade is fully
secure.
