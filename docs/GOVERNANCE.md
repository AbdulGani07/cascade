# Project governance

Cascade is maintained in public through the repository’s issues, pull requests, and release history.

## Roles

- **Contributors** submit issues, documentation, tests, and code.
- **Reviewers** provide technical review in areas they understand.
- **Maintainers** merge changes, manage releases, apply security policy, and make final repository decisions.

Roles are based on sustained, constructive participation. This document does not imply a legal entity or formal membership program.

Operational maintainer responsibilities and selection are described in
[Maintainers](../MAINTAINERS.md). Support channels are described in [Support](../SUPPORT.md).

## Decisions

Routine decisions are made in pull-request review. Changes to public contracts, security boundaries, language capability claims, or governance policy should include a written rationale and adequate review. Maintainers seek consensus; when consensus is unavailable, the responsible maintainer records the decision and tradeoffs.

## Transparency and conflicts

Technical decisions should be documented in the relevant issue or pull request. Reviewers should disclose material conflicts of interest and avoid approving their own security-sensitive changes without independent review.

## Conduct and security

Participation is governed by the [Code of Conduct](../CODE_OF_CONDUCT.md). Do not disclose suspected vulnerabilities in a public issue; follow [Security reporting](../SECURITY.md).

## Changes to governance

Governance changes use the same pull-request process as code and require maintainer approval.

## Issue stewardship

Maintainers use `good first issue` only for bounded work with clear files, acceptance criteria, and
tests that does not require security-sensitive or undocumented architectural decisions.
`help wanted` indicates useful, scoped work where maintainer guidance is available but prior project
context may be needed. Labels are invitations, not assignments; contributors should comment before
starting substantial work.
