# Public-beta operations

> Historical beta procedure. Use `docs/RELEASE_POLICY.md` for the current stable process.

## 20. Launch-day checklist

- Re-read repository, npm, Marketplace, and workflow public state; record timestamps.
- Confirm `main` CI and security workflows pass for the final commit.
- Confirm the retained VSIX hash matches the reviewed artifact and its manifest says prerelease.
- Inspect all native screenshots at 1440Ã—900 and approve or reject each one.
- Verify npm `latest` is still `3.3.0` and `next` is the reviewed beta version.
- Verify Marketplace publisher, extension identity, current public version, and owner permissions.
- Recheck environment protection, branch/tag rulesets, topics, description, and Discussions.
- Perform the external npm/Marketplace/GitHub steps only with the owner-approved runbook.
- Smoke-test public installs after any authorized upload.
- Post announcements only after public links work; do not claim unobserved settings or metrics.
- Open a feedback-triage issue/project and monitor security channels privately.

## 21. Seven-day beta checklist

- Triage reproducible installation, parser, edge-accuracy, performance, and documentation reports.
- Label security reports privately; do not move sensitive details into public issues.
- Re-run clean npm and VSIX installs on supported CI platforms after any beta update.
- Compare reports by language and project type without publishing proprietary fixtures.
- Track false-positive and false-negative examples as public minimal fixtures where permission exists.
- Improve docs before adding capability claims.
- Keep `latest` and stable Marketplace promotion unchanged unless stable criteria are met.

## 22. Thirty-day improvement plan

- Week 1: installation reliability, native-parser diagnostics, and feedback taxonomy.
- Week 2: prioritize accuracy fixes backed by minimal fixtures; add regression tests.
- Week 3: profile large repositories and improve bounded behavior without weakening safeguards.
- Week 4: audit documentation claims, supply-chain evidence, packaging, security posture, support
  load, and stable-readiness criteria.
- At day 30, publish an evidence-based beta summary only after owner review; do not infer adoption
  metrics that were not collected.

## External settings: read-only checks and owner commands

Run only while authenticated to the intended GitHub account:

```sh
gh auth status
gh repo view AbdulGani07/cascade --json nameWithOwner,visibility,description,repositoryTopics,hasDiscussionsEnabled
gh api repos/AbdulGani07/cascade/environments
gh api repos/AbdulGani07/cascade/rulesets
gh api repos/AbdulGani07/cascade/actions/runs --field per_page=20
```

Owner commands to apply reviewed missing settings later (do not run during repository preparation):

```sh
gh repo edit AbdulGani07/cascade --description "Local dependency intelligence and change-impact analysis for polyglot codebases, with a CLI, dashboard, architecture governance, and VS Code integration."
gh repo edit AbdulGani07/cascade --add-topic dependency-analysis,change-impact-analysis,static-analysis,code-intelligence,architecture,developer-tools,typescript,python,monorepo,vscode-extension
gh repo edit AbdulGani07/cascade --enable-discussions
```

Create or edit environments and branch/tag rulesets through a separately reviewed configuration or
the GitHub UI; do not use a broad mutation command without preserving the current rule definitions.

### npm owner UI checklist

- Confirm organization/package ownership and required maintainers.
- Confirm provenance and attestations on all intended public versions.
- Confirm `latest` remains stable and `next` points only to the reviewed beta.
- Confirm trusted publishing/OIDC configuration and no legacy automation token requirement.
- Confirm two-factor authentication and recovery ownership for maintainers.

### Marketplace owner UI checklist

- Confirm publisher `cascade-code`, display name, verified status, and owner membership.
- Confirm extension identity `cascade-code-intelligence`.
- Upload only the reviewed `3.3.1` VSIX as a prerelease; never reuse `3.3.0`.
- Confirm the prerelease badge, icon, README, links, and native screenshots after processing.
- Confirm a future stable release will have a numeric version greater than `3.3.1`.
