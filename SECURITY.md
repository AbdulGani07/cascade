# Security policy

## Supported versions

Security fixes are provided for the latest released major version. Older
versions may receive a fix at the maintainers' discretion.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use GitHub's
**Security → Report a vulnerability** private advisory flow for this repository,
or email `abdulgani10525@gmail.com`.

Include:

- affected version, package, command, and operating system;
- a minimal reproduction using non-sensitive test data;
- impact and required attacker access;
- whether symlinks, plugins, custom configuration, the dashboard, IDE extension,
  or GitHub Actions are involved;
- suggested mitigations, if known.

Do not include real credentials, proprietary source, customer data, or public
exploit links. We aim to acknowledge reports within 48 hours. Remediation and
disclosure timing depends on severity, reproducibility, and release safety; the
project does not promise a fixed resolution deadline.

## Security posture

Cascade treats analyzed repositories as hostile data. It does not intentionally
run repository source, package scripts, build tools, Gradle, Maven, CMake,
`setup.py`, compiler plugins, or framework configuration. Build files are
inspected as text or structured data. Dependency installation is never part of
analysis.

Third-party Cascade plugins execute in the Cascade process and therefore have
the user's filesystem and process permissions. Only install plugins from
publishers you trust. Plugin isolation is a residual risk, not a security
boundary.

The editor service uses private stdin/stdout pipes and is not a network service.
The dashboard binds only to `127.0.0.1`; it is not designed to be proxied or
exposed to a LAN. Cascade analysis contains no source-upload or telemetry path.
Generated reports can still contain sensitive repository metadata, so review
them before sharing.

Git impact analysis invokes the installed Git executable with argument arrays,
repository hooks disabled, and external diff/text-conversion disabled. VS Code
executable overrides are ignored in untrusted workspaces. Enabling third-party
plugins or explicitly configuring an executable remains a user trust decision.

See [docs/SECURITY.md](docs/SECURITY.md) for the full
threat model, operational guidance, and remaining risks.
The stable-release hardening review is recorded in
[docs/SECURITY_AUDIT_3_3_1.md](docs/SECURITY_AUDIT_3_3_1.md).
