# Product positioning and competitive evidence

This document is an internal decision aid, not public marketing copy. It records
what Cascade can defend today, where adjacent tools are stronger, and which
claims still need evidence.

Last external verification: **2026-07-29**

## Method

The analysis used two evidence sets:

1. Cascade's implementation, tests, schemas, generated demo artifacts, and
   documentation at version 3.3.0.
2. Current primary sources from official documentation, repositories, licence
   files, and published technical material.

Statements marked **verified** are directly supported by those sources.
**Inferred** statements are reasoned comparisons rather than vendor claims or
measured head-to-head results. **Unknown** means the source set did not establish
the answer. Vendor marketing was treated as a description of intended use, not
proof of accuracy, scale, or comparative superiority.

No competitor was installed or benchmarked. Installation experience below
describes the documented path, not an independent usability test. Absence from
official documentation is recorded as unknown, not as proof that a capability
does not exist.

## Cascade evidence baseline

The following is verified in this repository:

- File dependency graphs, reverse traversal, cycles, entry-point evidence,
  unreachable-file findings, and deletion simulation.
- Git base/head comparison; changed, deleted, and renamed path handling;
  affected files, symbols, projects, services, owners, and candidate tests.
- Evidence paths and a deterministic heuristic change-risk indicator.
- Configured architecture layers and dependency rules with suppressions.
- Terminal, JSON, Markdown, SARIF, HTML, and local dashboard outputs.
- A composite GitHub Action, editor service, and VS Code extension.
- First-party plugins at the capability levels documented in the
  [language matrix](CAPABILITY_MATRIX.md).
- Reproducible local performance measurements, including important scaling and
  cache limitations, in [performance methodology](PERFORMANCE.md).

These facts do not establish semantic completeness, production-failure
prediction, safe-refactoring guarantees, equal depth across languages, or
superiority over another tool.

## Competitive landscape

The table is intentionally qualitative. Unsupported numeric scoring would imply
precision the research does not have.

| Tool or category                                                                                                | Verified primary use, scope, and access                                                                                                                                                                                                                                                                                                                    | Verified graph, policy, Git, reporting, and visual capabilities                                                                                                                                                                                                                              | Strongest capability and important limit                                                                                                                                                                                     | Relationship to Cascade                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Madge](https://github.com/pahen/madge)                                                                         | Module dependency graphs and circular dependency detection for CommonJS, AMD, and ES modules, with selected stylesheet/preprocessor support. CLI/library installation through npm. Open source; MIT licence.                                                                                                                                               | File/module-oriented graph queries and image output; circular, dependent, orphan, and leaf queries. Git-aware change analysis, affected tests, architecture policy, and SARIF were not established by reviewed sources.                                                                      | **Strength:** focused graph visualization and cycle inspection in the JavaScript ecosystem. **Limit:** its documented scope is narrower than repository-wide change impact.                                                  | **Verified difference:** Cascade joins Git changes to downstream file/project/service/test evidence across documented polyglot plugins. **Inferred weakness:** Madge is simpler for a developer who only wants a JS module picture or cycle check.                                    |
| [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)                                            | Dependency validation and visualization for JavaScript, TypeScript, CoffeeScript, and related web formats. `npm`/`yarn`/`pnpm` install plus an interactive config initializer. Open source; MIT licence.                                                                                                                                                   | Rich allowed, forbidden, and required dependency rules; cycle and reachability conditions; JSON schema and multiple text/graph reporters. CI can fail on rule severity. Git-range, changed-symbol, service-impact, and affected-test workflows were not established by reviewed sources.     | **Strength:** mature, expressive architecture rules in its supported ecosystem. **Limit:** static expression-based imports remain unresolved, and the documented language focus is web/JS-centric.                           | **Verified difference:** Cascade connects policy findings with polyglot Git impact, risk evidence, candidate tests, SARIF, and PR artifacts. **Verified weakness:** dependency-cruiser's rule language and module filters are currently more expressive.                              |
| [Knip](https://knip.dev/)                                                                                       | Finds unused files, dependencies, and exports in JavaScript/TypeScript projects and workspaces. CLI/package ecosystem. Open source; ISC licence.                                                                                                                                                                                                           | Module graph underpins unused-code analysis; documented issue types cover files, dependencies, exports, binaries, and related configuration. Git-range impact, architecture policy, service graphs, SARIF, and affected-test selection were not established by reviewed sources.             | **Strength:** ecosystem-aware dead-code and unused-dependency focus. **Limit:** intentionally centered on JavaScript/TypeScript project semantics.                                                                           | **Verified difference:** Cascade's primary workflow is explaining downstream change impact across language and project boundaries. **Verified weakness:** Cascade's unreachable-file finding is not equivalent to Knip's specialized export/dependency cleanup depth or fix workflow. |
| [Nx](https://nx.dev/docs/reference/nx-commands)                                                                 | Monorepo task orchestration and CI optimization. Its CLI can create project/task graphs and run tasks for projects affected by a Git range or file set. Core repository is open source; reviewed sources did not fully classify every hosted/commercial feature or licence boundary.                                                                       | Project and task graphs, affected-project calculation, base/head and file inputs, graph visualization, and affected task/test execution. General source-symbol dependency extraction, architecture-rule depth, SARIF, and evidence-path semantics were not established by reviewed sources.  | **Strength:** affected execution integrated with an explicit project/task graph and build cache. **Limit:** the documented affected model is oriented to Nx project/task configuration, not a universal code-property graph. | **Verified difference:** Cascade reports static file/symbol/project/service impact and reasons without requiring an Nx workspace. **Verified weakness:** Cascade does not provide Nx's task runner, remote cache, or mature CI execution system.                                      |
| [Joern](https://docs.joern.io/)                                                                                 | Code-property-graph analysis for vulnerability research and static analysis, queried through a graph database and Scala-based DSL. Open source; Apache-2.0 licence is stated in its repository.                                                                                                                                                            | AST, control-flow, and data-flow representations with semantic queries across documented language frontends. Git-aware PR impact, architecture governance, routine CI reporting, SARIF, and affected-test selection were not established by reviewed sources.                                | **Strength:** deep program-analysis graph and query model. **Limit:** specialist query workflow and uneven documented frontend maturity make it a different adoption profile from a turnkey PR report.                       | **Verified difference:** Cascade packages dependency impact into CLI, CI, dashboard, and editor workflows. **Verified weakness:** Cascade does not implement Joern's code-property-graph, control-flow, or data-flow depth.                                                           |
| [CodeQL](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/)                    | Semantic code querying and security analysis for a documented set of compiled and interpreted languages. GitHub provides CLI/database and code-scanning workflows. Source availability and use are governed by GitHub's CodeQL terms; this review does not label the whole product simply open source or commercial.                                       | Database schemas expose AST, control flow, data flow, and other semantic relations; GitHub code scanning supports SARIF workflows. Architecture policy, general dependency visualization, PR blast-radius explanation, and affected-test selection were not established by reviewed sources. | **Strength:** deep security-oriented semantic analysis and query libraries. **Limit:** building and querying CodeQL databases is heavier than a dependency-impact CLI, and licence/use terms require case-specific review.   | **Verified difference:** Cascade focuses on review scope, dependency evidence, architecture boundaries, and test candidates. **Verified weakness:** Cascade is not a security-query engine and lacks CodeQL's semantic/data-flow depth and ecosystem.                                 |
| [Semgrep](https://github.com/semgrep/semgrep)                                                                   | Pattern and data-flow static analysis for security and correctness across 30+ documented languages, with CLI and hosted product workflows. The engine repository is open source under LGPL-2.1; hosted and advanced product capabilities have separate commercial terms.                                                                                   | Rules, CI integrations, findings, and machine-readable output; official materials describe code, secrets, and supply-chain products. Dependency/service visualization, general blast-radius graphs, and affected-test selection were not established by reviewed sources.                    | **Strength:** accessible rule authoring and broad security scanning ecosystem. **Limit:** a matched finding or taint path answers a different question from repository-wide downstream change impact.                        | **Verified difference:** Cascade explains structural dependents and candidate review/test scope. **Verified weakness:** Cascade does not offer Semgrep's security rules, taint analysis, managed policies, or vulnerability product.                                                  |
| [CodeScene](https://codescene.com/hubfs/web_docs/Behavioral-code-analysis-in-practice.pdf) and PR-risk analysis | Behavioral analysis combines version-control history with code-health and hotspot concepts; official material describes change coupling, hotspots, and change-oriented review use cases. Commercial product status is verified; exact licence, current language matrix, SARIF support, and affected-test behavior were not established in this source set. | Git history is a primary input and visualization is central. The reviewed whitepaper supports behavioral risk reasoning, but not a direct feature-by-feature technical equivalence to Cascade.                                                                                               | **Strength:** socio-technical and historical change evidence unavailable from a static dependency graph alone. **Limit:** important implementation and current plan details are not fully public or were not verified here.  | **Inferred difference:** Cascade's evidence is local, deterministic static structure plus a selected Git diff, not historical team behavior. **Verified weakness:** Cascade does not model temporal hotspots, change coupling over history, or organizational signals.                |

### Category conclusions

- **Dependency graphs and cycles:** proven, crowded entry capabilities; not a
  durable position by themselves.
- **Dead-code detection:** Cascade can report unreachable files, but should not
  claim parity with specialized unused-export and dependency tools.
- **Affected monorepo work:** Nx is the clearer reference for task execution and
  caching; Cascade can complement it with language-derived structural evidence.
- **Architecture policy:** useful pillar, but dependency-cruiser demonstrates
  greater rule-language depth in the JS ecosystem.
- **Code-property graphs and general static analysis:** Joern, CodeQL, and
  Semgrep are deeper in their respective semantic/security jobs. Competing on
  “more powerful static analysis” would be indefensible.
- **Visualization:** an evidence delivery surface, not the category to own.
- **PR risk:** Cascade's risk indicator is explainable and deterministic, but
  uncalibrated against incidents; it must never be presented as failure
  probability.
- **Affected tests:** promising differentiation when every candidate includes a
  path and confidence. It remains selection assistance, not test-completeness
  proof.

## Recommended position

### Primary positioning statement

**Cascade is an explainable change-impact analyzer for polyglot repositories. It
maps a Git change to the files, projects, services, architecture boundaries, and
candidate tests that may be affected, and shows the static evidence behind each
result.**

### Supporting pillars

1. **Evidence before scores.** Dependency paths, unresolved edges, plugin
   provenance, and documented confidence make findings inspectable.
2. **One review model across languages and boundaries.** File and symbol
   evidence rolls up to project and service impact without claiming equal
   semantic depth for every language.
3. **Governance in the change workflow.** Architecture rules, affected-test
   candidates, SARIF, and PR-friendly reports turn the graph into review action.

### Message set

- **Homepage message:** Understand the blast radius of a code change. Cascade
  traces a Git diff through a polyglot repository and explains the files,
  projects, services, boundaries, and tests that may be affected.
- **GitHub repository description:** Explainable polyglot change-impact analysis
  with dependency graphs, architecture rules, and affected-test candidates.
- **README headline:** Understand the blast radius of every code change.
- **README subheading:** Cascade maps Git changes through polyglot dependency
  graphs to explain affected code, architecture boundaries, services, and
  candidate tests.
- **Recommended GitHub topics:** `change-impact-analysis`,
  `dependency-analysis`, `static-analysis`, `architecture-governance`,
  `dependency-graph`, `affected-tests`, `monorepo`, `sarif`, `developer-tools`,
  `code-intelligence`.

The current public README is already accurate and close to this message. Its
wording should not be changed merely for novelty before user evidence validates
the new phrasing.

## Audience and demonstration

### Target early adopters

- Maintainers of medium-to-large polyglot monorepos whose review scope crosses
  package, language, or service boundaries.
- Platform and architecture teams introducing dependency boundaries but not yet
  ready to block builds on opaque findings.
- Teams with costly integration suites that want explainable test candidates
  while retaining a conservative fallback test policy.
- Open-source maintainers who need local, inspectable PR artifacts rather than a
  hosted code upload.

### Concrete demo storyline

Use the reproducible Cascade Commerce fixture. Start from a PR that changes the
authentication token module and show:

1. the small Git diff;
2. direct and transitive dependents across TypeScript, Python, and Go projects;
3. the dependency paths explaining affected entry points and services;
4. an introduced architecture violation or cycle;
5. candidate unit and integration tests with confidence and reasons;
6. the same evidence in terminal, Markdown PR report, SARIF, and dashboard;
7. a limitation callout for an unresolved dynamic edge.

Success is not a dramatic risk number. It is a reviewer being able to verify why
an item is in scope and notice what the analyzer could not resolve.

## Product implications

### Prioritize

1. Resolution precision and transparent unresolved-edge diagnostics in the
   strongest language plugins.
2. Persistent incremental analysis with a complete, tested invalidation model;
   current benchmarks explicitly show no warm-run speedup.
3. Evidence-backed affected-test evaluation against real repositories, including
   recall studies and a conservative CI fallback mode.
4. Stable report/config schemas and provenance so CI consumers can trust
   upgrades.
5. Better change-level symbol mapping and project/service rollups, always
   retaining paths to file-level evidence.
6. Architecture-rule ergonomics: baselines, narrow suppressions, ownership, and
   actionable explanations.

### Do not prioritize now

- A general security scanner, taint engine, or vulnerability rule marketplace.
- A universal compiler/type checker or full code-property graph for every
  language.
- A hosted build runner or remote cache competing with Nx.
- Automated refactoring or deletion based solely on reachability.
- More pattern-based language badges without resolution fixtures and measured
  user demand.
- Predictive AI risk scores before outcome data, calibration, and auditability
  exist.
- Large-graph visual effects that do not improve a reviewer decision.

### Principal adoption obstacles

- Uneven language depth and inevitable blind spots from dynamic dispatch,
  reflection, generated code, build conditions, and runtime configuration.
- Setup cost for accurate project, service, ownership, and architecture
  boundaries.
- False confidence from an attractive graph or low risk score.
- No persistent incremental cache yet; large repositories can have material
  analysis time and full impact payloads can grow quadratically.
- No public package is currently available, so the documented repository build
  is a higher-friction trial.
- Limited independent validation on real external monorepos and no published
  affected-test recall or incident-correlation study.
- Existing specialist tools may already solve one slice more deeply.

## Claim policy

### Safe claims

- Cascade performs static dependency and change-impact analysis.
- It uses Git changes to report potentially affected files, symbols, projects,
  services, owners, and candidate tests.
- Findings can include dependency paths, confidence, provenance, and unresolved
  dependency evidence.
- It supports the language and format capability levels listed in the versioned
  capability matrix.
- It detects cycles, reports unreachable files, and evaluates configured
  architecture dependency rules.
- It emits the documented terminal, JSON, Markdown, SARIF, HTML, dashboard, CI,
  and editor surfaces.
- Its change-risk indicator is deterministic for the documented fixed inputs and
  is a review-prioritization heuristic.
- Source analysis and the dashboard run locally in the documented workflows.

Every public use of “supports” should link to the capability matrix or name the
specific capability. Performance claims must include fixture, environment,
date, and mode.

### Claims Cascade must not make

- Supports every language, or has equal semantic depth across supported
  languages.
- Predicts breakage, incidents, or production failure.
- Guarantees safe refactoring, safe deletion, complete impact, or complete test
  selection.
- Has zero false positives or false negatives.
- Replaces compilers, test suites, security scanners, runtime tracing, or human
  review.
- Is faster, more accurate, more scalable, or more comprehensive than a named
  competitor without a reproducible comparative study.
- Is a code-property graph, full semantic analyzer, or enterprise-grade platform
  without corresponding implementation and evidence.
- A low risk score means a change is safe, or a high score is a probability of
  failure.
- Unresolved or unobserved dependencies are absent dependencies.

### Ethical and accuracy disclaimer

Cascade reports evidence observable through configured static analysis and Git
metadata. Dynamic behavior, generated code, unresolved imports, external
systems, environment-specific builds, and language-plugin limitations can omit
real relationships. Candidate tests and risk levels assist review; they must not
be the sole basis for skipping tests, approving a change, deleting code, or
making safety-critical decisions. Teams should disclose material analyzer
limitations when Cascade output influences policy.

## Sources

All external sources were verified on 2026-07-29.

- Madge: [official repository and documentation](https://github.com/pahen/madge)
- dependency-cruiser:
  [official repository](https://github.com/sverweij/dependency-cruiser),
  [rules reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md),
  and [CLI reference](https://github.com/sverweij/dependency-cruiser/blob/main/doc/cli.md)
- Knip: [official documentation](https://knip.dev/),
  [project-file model](https://knip.dev/guides/configuring-project-files),
  [FAQ](https://knip.dev/reference/faq), and
  [official repository/licence](https://github.com/webpro-nl/knip)
- Nx: [commands reference](https://nx.dev/docs/reference/nx-commands),
  [mental model](https://nx.dev/docs/concepts/mental-model), and
  [project graph documentation](https://nx.dev/features/explore-graph)
- Joern: [official documentation](https://docs.joern.io/),
  [code-property graph overview](https://docs.joern.io/code-property-graph/),
  and [CPG specification](https://cpg.joern.io/)
- CodeQL:
  [supported languages and frameworks](https://codeql.github.com/docs/codeql-overview/supported-languages-and-frameworks/),
  [CodeQL documentation](https://codeql.github.com/docs/), and
  [official repository terms](https://github.com/github/codeql)
- Semgrep: [official engine repository](https://github.com/semgrep/semgrep) and
  [official documentation](https://semgrep.dev/docs/)
- CodeScene: [Behavioral Code Analysis in
  Practice](https://codescene.com/hubfs/web_docs/Behavioral-code-analysis-in-practice.pdf)

## Open research backlog

- Run version-pinned, reproducible comparison fixtures instead of feature-table
  inference, with each tool configured by an experienced user.
- Verify current licence and open-source/commercial boundaries for every Nx,
  CodeQL, Semgrep, and CodeScene component relevant to a deployment.
- Measure Cascade precision and recall for dependency resolution and
  affected-test candidates on consented external repositories.
- Compare cold and incremental runtime, memory, and output size on the same
  hardware; do not reuse vendor benchmark numbers.
- Interview target maintainers to test whether change-impact evidence changes
  review or test decisions and whether setup cost is acceptable.
- Research Bazel, Pants, Turborepo, Jest related-tests, and language-native
  affected-test tools if execution planning becomes a primary product direction.
- Verify current SARIF and machine-readable output support per competitor version
  before publishing any public comparison.
