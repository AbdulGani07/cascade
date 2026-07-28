# Cascade Architecture Audit & Implementation Roadmap

**Document Version:** 1.0.0

**Updated At:** 2026-07-28

**Status:** Historical audit; implementation progress is tracked in `CHANGELOG.md`

**Author:** Principal Software Architect & Code Intelligence Lead

---

> This document records the repository audit that motivated the current
> architecture. Several findings below have since been addressed, including
> workspace lockfile support, automated tests, portable dashboard asset
> resolution, normalized report paths, and the plugin-based analysis pipeline.
> Refer to `CHANGELOG.md` for the authoritative implementation status.

## Executive Summary & Product Positioning

### Product Positioning Statement
> **“Cascade is dependency intelligence and change-impact analysis for modern JavaScript and TypeScript codebases, evolving into a production-grade, language-agnostic code-intelligence platform.”**

Cascade enables engineers, architects, and engineering managers to visualize structural dependencies, detect circular import loops, discover unreachable/dead code, simulate change blast radiuses, enforce architectural boundaries, and report pull-request risk directly in CI/CD.

---

## 1. Rigorous Repository Technical Audit

### 1.1 Root Configuration & Monorepo Infrastructure
* **Package Manager Mismatch:**
  * Root `package.json` contains npm workspace scripts (`npm run build --workspaces`, `npm run dev --prefix packages/dashboard`).
  * Root directory contains `bun.lock`, but **no** `package-lock.json` or `pnpm-lock.yaml`.
  * `.github/workflows/ci.yml` invokes `pnpm install --frozen-lockfile` without a `pnpm-lock.yaml` file, causing CI builds to immediately fail.
* **TypeScript Setup:**
  * `tsconfig.base.json` defines root TypeScript options, but project references across `packages/core`, `packages/cli`, and `packages/dashboard` lack strict path aliases for workspace packages, forcing relative import path hackiness.

### 1.2 Core Analysis Engine (`@cascade/core`)
* **AST Parsing & Babel Configuration (`packages/core/src/parser/astParser.ts`):**
  * Uses `@babel/parser` with `sourceType: "module"` and plugins `["typescript", "jsx"]`.
  * **Defects:**
    * Fails on modern syntax features (e.g., decorators without legacy configuration, top-level await in certain contexts, import attributes / assertions).
    * Resolves imports purely via string concatenation in `path.resolve(dirname, source)`.
    * **No support for TypeScript `compilerOptions.paths` (path aliases like `@/components/*`).**
    * **No support for Node.js subpath imports (`#utils`).**
    * **Does not attempt extension resolution (`.ts`, `.tsx`, `.js`, `.jsx`, `/index.ts`).** If an import omits the extension (e.g., `import { x } from './utils'`), file resolution breaks or falls back incorrectly.
* **File Scanner (`packages/core/src/parser/fileScanner.ts`):**
  * Relies on basic `fs.readdirSync` recursion.
  * Lacks respect for `.gitignore` rules, ignoring `node_modules` only via hardcoded string match.
  * Loads all file contents synchronously into memory at scan time, creating severe heap memory bottlenecks on codebases over 10,000 files.
* **Graph Algorithms & Data Structures (`packages/core/src/graph/`):**
  * `dependencyGraph.ts` stores nodes and edges as plain arrays (`string[]` and `{ from, to }[]`).
  * Searching incoming/outgoing edges requires an $O(E)$ linear scan over all edges for every query.
  * Impact simulation (`impactSimulator.ts`) performs repeated edge filtering iterations, resulting in quadratic $O(V \cdot E)$ execution cost on deep dependency trees.
* **Cycle Detection (`packages/core/src/graph/cycleDetector.ts`):**
  * Uses standard DFS traversal but creates duplicate cycle paths when cycles are traversed from different starting nodes.
* **Entry Point Detection (`packages/core/src/analysis/entryPointDetector.ts`):**
  * Hardcodes candidate entry paths to a static list (`src/index.ts`, `src/app.ts`, `src/main.ts`, `src/index.js`).
  * Fails to parse `package.json` (`main`, `module`, `exports` fields) or framework conventions (Next.js `app/` routes, Vite `index.html`, Remix/Astro entrypoints).
* **Dead Code Analyzer (`packages/core/src/analysis/deadCodeAnalyzer.ts` & `unusedFileDetector.ts`):**
  * Computes unreachable nodes via reachability from detected entry points. Because entry point detection is incomplete, valid code is frequently misidentified as dead code.

### 1.3 Command-Line Interface (`@cascade/cli`)
* **Dashboard Serving (`packages/cli/src/commands/dashboard.ts`):**
  * Attempts to resolve dashboard static assets at `packages/dashboard/dist` relative to `process.cwd()`.
  * Running `cascade dashboard` from any subdirectory other than the monorepo root crashes with `ENOENT`.
* **Output Formatting & JSON Schemas (`packages/cli/src/ui/` & `commands/`):**
  * Commands (`analyze`, `graph`, `deadcode`, `impact`) emit different JSON structures with unnormalized path formats (mixing Windows backslashes `\` and POSIX forward slashes `/`).
* **Path Leakage:**
  * Absolute file paths (e.g., `/Users/dev/project/src/index.ts`) are dumped directly in terminal output and exported JSON, breaking portable CI execution.

### 1.4 Visual Dashboard (`@cascade/dashboard`)
* Built with React, Vite, Tailwind CSS, and React Flow.
* Depends on static JSON dumps or a local dev server API.
* Lacks virtualized rendering for large dependency graphs (>500 nodes), causing browser frame drops.

---

## 2. Categorized Defects Matrix

| Category | Severity | File Reference | Description |
| :--- | :--- | :--- | :--- |
| **Critical Blocker** | High | `.github/workflows/ci.yml` | CI uses `pnpm --frozen-lockfile` without `pnpm-lock.yaml`. |
| **Critical Blocker** | High | `packages/cli/src/commands/dashboard.ts` | Static path `packages/dashboard/dist` fails outside root CWD. |
| **Accuracy** | High | `packages/core/src/parser/astParser.ts` | Omits extension resolution (`.ts`, `.tsx`, `/index.ts`) & TS path aliases (`tsconfig.json`). |
| **Accuracy** | Medium | `packages/core/src/analysis/entryPointDetector.ts` | Ignores `package.json` exports/main and framework route directories. |
| **Performance** | High | `packages/core/src/graph/dependencyGraph.ts` | Array-based edge list forces $O(E)$ lookups; graph traversal is $O(V \cdot E)$. |
| **Performance** | Medium | `packages/core/src/parser/fileScanner.ts` | Synchronous recursive FS read loads all files into memory at once without glob filtering. |
| **DX / Quality** | Medium | Root / All packages | 0 automated unit or integration tests exist in the entire monorepo. |
| **Packaging** | Medium | Root `package.json` | Mixed Bun/npm configuration with missing workspace package publish declarations. |
| **Security** | Medium | `packages/cli/src/commands/dashboard.ts` | Express static file server lacks strict directory boundary sanitization. |
| **Documentation** | Low | `/README.md` | Lacks setup guides, architecture diagrams, CLI command reference, and contribution rules. |

---

## 3. Targeted Architecture & Package Structure

### Proposed Monorepo Structure (`packages/`)
```
cascade/
├── packages/
│   ├── core/                  # Language-agnostic graph engine, AST plugin registry, analysis rules
│   ├── plugin-javascript/     # JS/TS/JSX/TSX AST parser, TSConfig alias resolver, SWC/Babel integration
│   ├── cli/                   # Unified CLI with commander, tabular renderer, interactive TUI, JSON exporter
│   ├── dashboard/             # React Flow dynamic visualizer with graph filters & risk badges
│   └── github-action/         # CI Pull-Request blast radius annotation bot
├── .github/
│   ├── workflows/             # CI/CD pipelines (pnpm, unit tests, integration tests, linting)
│   ├── ISSUE_TEMPLATE/        # Bug report and feature request templates
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── SECURITY.md
├── pnpm-workspace.yaml        # Single source of truth for monorepo package management
├── pnpm-lock.yaml             # Lockfile generated for frozen CI builds
└── README.md
```

### Core Plugin API Interface (`@cascade/core`)
```typescript
export interface SourceFile {
  filePath: string; // Relative path from project root
  content: string;
  languageId: string;
}

export interface DependencyImport {
  specifier: string;  // e.g., '@/components/Button'
  resolvedPath?: string; // e.g., 'src/components/Button.tsx'
  isExternal: boolean;
  kind: 'static' | 'dynamic' | 'type-only';
}

export interface LanguagePlugin {
  id: string;
  name: string;
  supportedExtensions: string[];
  parseImports(file: SourceFile, context: AnalysisContext): Promise<DependencyImport[]>;
  detectEntryPoints(projectRoot: string): Promise<string[]>;
}
```

---

## 4. Phased Implementation Roadmap

### Phase 0: Repository Stabilization & Working CI
* **Objectives:** Standardize package management on `pnpm`, fix broken CI workflow, clean up root scripts, establish build pipelines.
* **Components to Modify:** `package.json`, `.github/workflows/ci.yml`, `tsconfig.base.json`.
* **New Components:** `pnpm-workspace.yaml`, `pnpm-lock.yaml`.
* **Acceptance Criteria:** `pnpm install`, `pnpm run build`, and `pnpm run lint` execute cleanly locally and in GitHub Actions CI.

### Phase 1: Trustworthy JavaScript & TypeScript Analysis
* **Objectives:** Build an accurate JS/TS import resolver with `tsconfig.json` path alias support, file extension fallback (`.ts`, `.tsx`, `.js`, `.jsx`, `/index.ts`), and `package.json` entry point parsing.
* **Components to Modify:** `packages/core/src/parser/astParser.ts`, `packages/core/src/parser/fileScanner.ts`, `packages/core/src/analysis/entryPointDetector.ts`, `packages/core/src/graph/dependencyGraph.ts`.
* **Acceptance Criteria:** Resolves `@/` path aliases, handles extensionless imports, correctly identifies entry points from `package.json` and Next.js/Vite layouts.

### Phase 2: Language-Plugin Architecture
* **Objectives:** Decouple `@cascade/core` into a pure graph and rule engine, extracting JS/TS logic into `@cascade/plugin-javascript`.
* **Components to Create:** `@cascade/plugin-javascript`, `PluginRegistry` in `@cascade/core`.
* **Acceptance Criteria:** Core accepts pluggable language parsers via a unified SPI.

### Phase 3: Initial Additional Languages (Python, Go, Rust)
* **Objectives:** Add basic import parsing support for Python (`import x`, `from y import z`), Go (`import (...)`), and Rust (`use x::y`).
* **Components to Create:** `@cascade/plugin-python`, `@cascade/plugin-go`.

### Phase 4: Monorepo & Framework Intelligence
* **Objectives:** Understand multi-package boundary constraints (pnpm workspaces, Turborepo, Nx, Lerna) and framework routes (Next.js, Remix, SvelteKit, Express).

### Phase 5: Git & Pull-Request Impact Analysis
* **Objectives:** Integrate `simple-git` to compare feature branches against `main`, mapping changed files to affected downstream graph nodes (Blast Radius score).

### Phase 6: Architecture Governance & Rules Engine
* **Objectives:** Implement `.cascaderc.json` architecture boundary rules (e.g. `disallow: "src/db/**" -> "src/ui/**"`).

### Phase 7: Editor, CI, and Platform Integrations
* **Objectives:** Create `@cascade/github-action` to post PR impact summaries directly on GitHub Pull Requests.

### Phase 8: Performance & Enterprise Scale Readiness
* **Objectives:** Migrate AST scanning to worker threads or SWC native bindings for codebases >50,000 files; implement incremental caching (`.cascade/cache.json`).

### Phase 9: Documentation, Community & Launch Assets
* **Objectives:** Complete public API documentation, interactive demo dashboard hosting, and open-source compliance (`LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`).

---

## 5. Testing Strategy

1. **Unit Tests (Vitest):**
   * Graph operations (`AdjacencyListGraph` cycle detection, reachability, topological sort).
   * Import specifier resolution (`tsconfig` aliases, relative resolution, extension fallbacks).
2. **Integration Tests:**
   * Full scan of real-world fixtures (`test-project`, sample Next.js app, sample monorepo).
3. **Snapshot Tests:**
   * Validating deterministic JSON schema outputs for CLI commands.

---

## 6. Migration Risks & Architectural Principles

### Key Principles:
1. **POSIX Path Normalization:** All graph node keys MUST be normalized relative POSIX paths (e.g., `src/utils/index.ts`) across Windows and Linux.
2. **Deterministic Graphs:** Given identical source code, graph edge outputs must be 100% deterministic.
3. **No Hidden Local State:** CLI and core operations must never leak absolute host machine paths into generated artifacts or reports.

---

## 7. Definition of Done (DoD)

- [x] Repository stabilized under unified package manager (`pnpm`).
- [x] All packages build cleanly via `pnpm run build`.
- [x] CI pipeline passes with green status.
- [x] Zero absolute path leaks in exported analysis JSON.
- [x] Full unit test coverage for core graph and import resolution logic.
- [x] Comprehensive documentation published.

---

## 8. Prioritized List of Top 20 Immediate Tasks

1. Create `pnpm-workspace.yaml` and standardize package manager on `pnpm`.
2. Generate valid `pnpm-lock.yaml` and update `.github/workflows/ci.yml`.
3. Fix `packages/cli/src/commands/dashboard.ts` static path resolution.
4. Convert `DependencyGraph` internal storage to `Map<string, Set<string>>` adjacency list.
5. Add path normalization helper (`toPosixRelativePath`).
6. Integrate `tsconfig-paths` or custom alias mapper in JS/TS parser.
7. Implement extension fallback logic (`.ts`, `.tsx`, `.js`, `.jsx`, `/index.ts`) in parser.
8. Enhance `entryPointDetector.ts` to parse `package.json` main/module/exports fields.
9. Implement relative path output formatting in CLI tables and JSON exports.
10. Install Vitest in `@cascade/core` and write unit tests for graph algorithms.
11. Add unit tests for JS/TS import parsing and alias resolution.
12. Create `LICENSE` (MIT) and `SECURITY.md` in repository root.
13. Refactor `impactSimulator.ts` to use memoized BFS over adjacency lists.
14. Add glob-based `.gitignore` filtering to `fileScanner.ts`.
15. Define formal JSON export schema interface in `@cascade/core`.
16. Implement `.cascaderc.json` loader with validation schema.
17. Extract JS parser into `@cascade/plugin-javascript`.
18. Implement `git diff` blast radius analyzer command (`cascade impact --git`).
19. Create `@cascade/github-action` workspace package.
20. Publish complete CLI documentation and architecture guide in `README.md`.

---

## 9. Exact Files to Modify in Phase 1

* `/package.json`
* `/pnpm-workspace.yaml` (new)
* `/.github/workflows/ci.yml`
* `/packages/core/src/types/index.ts`
* `/packages/core/src/parser/astParser.ts`
* `/packages/core/src/parser/fileScanner.ts`
* `/packages/core/src/graph/dependencyGraph.ts`
* `/packages/core/src/graph/cycleDetector.ts`
* `/packages/core/src/graph/graphAlgorithms.ts`
* `/packages/core/src/analysis/entryPointDetector.ts`
* `/packages/core/src/analysis/impactSimulator.ts`
* `/packages/cli/src/commands/dashboard.ts`
* `/packages/cli/src/commands/analyze.ts`
* `/packages/cli/src/commands/impact.ts`
* `/README.md`
