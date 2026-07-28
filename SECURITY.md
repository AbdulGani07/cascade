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

See [docs/SECURITY_THREAT_MODEL.md](docs/SECURITY_THREAT_MODEL.md) for the full
threat model, operational guidance, and remaining risks.
