# Public-beta announcement drafts

All drafts require owner review immediately before posting. Replace no facts with unverified
metrics, testimonials, or compatibility claims.

## 12. Show HN draft

**Title:** Show HN: Cascade â€” local dependency and change-impact analysis for polyglot codebases

We built Cascade to answer practical questions before a change: what depends on this file, which
paths connect two modules, where are the cycles, and which tests have static evidence of being
affected?

Cascade runs locally and includes no telemetry. The public beta has an npm CLI, a loopback-only
dashboard, architecture-governance checks, reports, and a VS Code prerelease. It supports structured
analysis for JavaScript/TypeScript, Python, Java, Kotlin, C#, Go, Rust, C, and C++, with additional
languages offering capability-dependent evidence.

Try it:

```sh
npm install --global @cascade-code/cli@next
cascade doctor .
cascade analyze .
```

Repository: https://github.com/AbdulGani07/cascade

We especially want reproducible feedback on installation, false positives/negatives, large
workspaces, and the clarity of impact evidence. Cascade is a static-analysis review aid, not a
guarantee of breakage or complete affected-test selection.

## 13. Reddit draft

**Suggested community:** a developer-tools or static-analysis community whose rules permit
self-posted open-source beta feedback.

**Title:** Feedback wanted: local polyglot dependency and change-impact analysis

I'm preparing the public beta of Cascade, an open-source local analysis tool for dependency graphs,
cycles, architecture rules, change impact, and affected-test candidates. It has an npm CLI,
loopback-only dashboard, and VS Code prerelease, with no telemetry or source upload.

The most useful feedback would be a minimal public fixture plus expected versus observed edges or
impact evidence. Language capability varies and dynamic behavior remains a known limitation.

Install: `npm install --global @cascade-code/cli@next`

Source and docs: https://github.com/AbdulGani07/cascade

## 14. Dev.to/Hashnode article

**Title:** Making change impact reviewable with local dependency evidence

A code change rarely stays inside one file. Reviewers need to know which modules depend on it,
whether there is a dependency path to a sensitive boundary, where cycles complicate reasoning, and
which tests have evidence of being relevant.

Cascade's public beta approaches these questions with a local dependency graph. The CLI, dashboard,
reports, architecture governance, and VS Code prerelease share the same evidence model. Analysis
does not upload source and the product includes no telemetry.

Start with:

```sh
npm install --global @cascade-code/cli@next
cascade doctor .
cascade analyze .
```

Then inspect graph, impact, diff, affected-test, and governance commands in the CLI guide. Treat
the output as review evidence: static analysis cannot see every runtime registration, generated
edge, or framework convention, and affected tests are candidates rather than a complete proof.

The beta request is deliberately concrete: share a minimal public fixture, the command and version,
expected behavior, actual behavior, and whether the result is a missing edge, extra edge,
installation issue, performance problem, or documentation gap.

Repository: https://github.com/AbdulGani07/cascade

## 15. LinkedIn draft

Cascade is ready for public-beta review: local dependency graphs, change impact, cycles,
architecture governance, affected-test candidates, reports, a loopback dashboard, and a VS Code
prerelease.

It is telemetry-free and does not send source code to a hosted Cascade service. The goal is
reviewable evidence, not exaggerated certainty: static results have explicit limitations.

Install the beta with `npm install --global @cascade-code/cli@next`, or find Cascade Code
Intelligence from publisher `cascade-code` in VS Code and select the prerelease.

Feedback with small reproducible public fixtures is especially welcome:
https://github.com/AbdulGani07/cascade

## 16. Concise X thread

1. Cascade is entering public beta: local dependency and change-impact analysis for polyglot
   repositories. CLI, reports, architecture checks, dashboard, and a VS Code prerelease. ðŸ§µ
2. It runs locally, includes no telemetry, and does not upload source to a Cascade service.
3. Try: `npm install -g @cascade-code/cli@next` then `cascade doctor .` and `cascade analyze .`
4. Static evidence has limits: no guaranteed breakage detection or complete affected-test
   selection. Reproducible feedback is the point.
5. Source, docs, and issue tracker: https://github.com/AbdulGani07/cascade
