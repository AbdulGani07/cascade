# Maintainers

Cascade is currently maintained by the repository owner and trusted collaborators granted explicit
GitHub access. The GitHub permissions list is the authoritative roster; this file intentionally
avoids duplicating access state that can become stale.

## Responsibilities

Maintainers triage reports, review changes, protect security boundaries and compatibility contracts,
keep CI healthy, and operate releases according to [the release policy](docs/RELEASE_POLICY.md).
Release, npm, Marketplace, and security-advisory access should use least privilege and 2FA.

## Review checklist

- Confirm scope, reproduction, and acceptance criteria.
- Check architectural placement and public compatibility.
- Require regression coverage and accurate documentation.
- Review security, path handling, determinism, resource bounds, and untrusted-input behavior.
- Check schema, plugin API, Node.js, Changeset, and migration implications.
- Verify required CI checks; do not bypass failures without a documented repository fix.
- Disclose conflicts of interest and request independent review for sensitive changes.
- Close with a clear reason or identify a concrete next action.

## Becoming or leaving a maintainer

Maintainer access is based on sustained, constructive contributions, sound review judgment, and
demonstrated care for users and contributors. Existing maintainers decide access changes by
consensus where practical. Departing maintainers should transfer responsibilities and promptly
remove credentials and external-service access.
