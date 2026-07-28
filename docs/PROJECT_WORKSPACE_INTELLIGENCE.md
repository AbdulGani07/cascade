# Project and workspace intelligence

Updated: 2026-07-28

Cascade builds a deterministic project graph alongside the file graph. Project
nodes are created only from manifests or structured configuration; configuration
files are evidence and are never promoted to ordinary source imports.

## Project-detection matrix

| Domain                | Project units                                                     | Evidence                                                                      |
| --------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| JavaScript/TypeScript | npm package, application, library, service, workspace             | `package.json`, npm/pnpm/Yarn workspaces, framework dependencies              |
| Python                | package, application/service, nested project                      | `pyproject.toml`, Poetry, uv, PDM, Hatch, `setup.py`, `setup.cfg`             |
| Java/Kotlin           | Maven/Gradle module, JVM library/application, Android application | `pom.xml`, Gradle settings/build files                                        |
| C#                    | solution and MSBuild project                                      | `.sln`, `.csproj`, `ProjectReference`                                         |
| Go                    | module and multi-module workspace                                 | `go.mod`, `go.work`                                                           |
| Rust                  | crate and Cargo workspace                                         | `Cargo.toml`, workspace members, path dependencies                            |
| C/C++                 | native build project and nested target directory                  | CMake, Make, Meson, Bazel metadata                                            |
| Mobile                | Android application, Flutter package/application, Swift package   | Gradle Android plugins, `pubspec.yaml`, `Package.swift`                       |
| Infrastructure        | container, deployment, Terraform module, CI unit                  | Dockerfile/Compose, Kubernetes YAML, `.tf`, GitHub Actions, GitLab/generic CI |

Nested ownership uses longest-root matching. A file is directly owned by exactly
one project, so a workspace includes its own files but does not double-count files
owned by child projects. Polyglot roots merge compatible evidence and emit
`PROJECT_DEFINITION_CONFLICT` when detectors disagree on build systems.

## Build-system matrix

| Build system                              | Detection                              | Static relationships                                 |
| ----------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| npm, pnpm, Yarn                           | package manager and workspace metadata | packages, workspace/runtime/test dependencies        |
| Turborepo, Nx, Rush, Lerna                | root configuration                     | workspace/package membership where literal           |
| Vite, Next.js, NestJS                     | package metadata/config                | framework role and configuration evidence            |
| Poetry, uv, PDM, Hatch, setuptools        | `pyproject.toml` and setup metadata    | project/workspace identity; literal local paths only |
| Maven                                     | parent/module POMs                     | packages/build relationships                         |
| Gradle                                    | settings and build scripts             | included projects; Android classification            |
| MSBuild/.NET                              | solution/project XML                   | packages and build dependencies                      |
| Go                                        | module/workspace files                 | workspace dependencies                               |
| Cargo                                     | package/workspace TOML                 | packages and build dependencies                      |
| CMake, Meson                              | literal subdirectories                 | build dependencies                                   |
| Make, Bazel                               | safely readable declarations           | project/target identity; no program execution        |
| Flutter, SwiftPM                          | package manifests                      | package identity and literal members                 |
| Docker/Compose, Kubernetes, Terraform, CI | deployment configuration               | packages, references, deploys                        |

## Typed relationship model

| Relationship            | Meaning                                                | Typical evidence                               |
| ----------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| `workspace-depends-on`  | workspace explicitly includes/uses another project     | `go.work`, workspace metadata                  |
| `build-depends-on`      | target is required to build source                     | project/path references, native subdirectories |
| `runtime-depends-on`    | target is a production/runtime package                 | production/peer dependencies                   |
| `test-depends-on`       | target is test/development-only                        | development dependencies                       |
| `generates`             | source project produces a generated unit               | literal generator/output metadata              |
| `deploys`               | deployment or CI unit targets a project/service        | build contexts, working directories, images    |
| `packages`              | workspace/solution aggregates a child                  | workspace members, Maven/Gradle modules        |
| `references`            | typed metadata reference without stronger semantics    | Terraform module source                        |
| `extends-configuration` | configuration inherits another project's configuration | literal `extends` paths                        |

Every edge has a stable ID, confidence, human-readable evidence, and repository-
relative source files. Missing targets are not guessed.

## Project/file navigation and grouping

`projectGraph.fileToProject` and `projectGraph.projectToFiles` bridge both graph
levels. `groups` provides deterministic facets by language, role, build system,
and enclosing workspace. File nodes also expose `project` and
`packageOrWorkspace`. The dashboard's **Projects** view visualizes typed service
and package dependencies; the CLI exposes the same data:

```bash
cascade projects path/to/repository
cascade projects path/to/repository --project apps/web
cascade graph path/to/repository --project --json
```

Partial analysis and overrides live in `cascade.config.json`:

```json
{
  "selectedProjects": ["apps/web"],
  "projectOverrides": {
    "apps/web": { "name": "frontend", "projectType": "service" },
    "legacy/unused": { "ignore": true }
  }
}
```

Custom language plugins may provide deterministic `projectDetectors`. A detector
can return one project, multiple projects, or no result. Synchronous analysis
sorts detectors by ID; asynchronous detectors are diagnosed and skipped.

## Example polyglot result

The fixture combines Node, Rust, Python/uv, Go, Flutter, CMake, Terraform, and
containers. Its infrastructure project retains the Terraform evidence:

```json
{
  "from": "infra",
  "to": "services/worker",
  "type": "references",
  "confidence": 0.9,
  "evidence": ["Terraform module source '../services/worker'"],
  "sourceFiles": ["infra/main.tf"]
}
```

Changing `packages/shared` impacts `apps/web` through the reverse project graph.
Project cycles are computed over typed project adjacency, independently from file
cycles.

## Performance evidence

Run `pnpm benchmark` on the target machine. The benchmark reports 100- and
1,000-package workspace graphs in addition to 100, 1,000, and 5,000-file graphs.
Results are recorded in `benchmarks/README.md`; generated repositories are
deleted after each run.

## Known limitations

- Cascade does not execute build tools, package managers, Docker, Terraform, CI,
  Xcode, CMake, Gradle, or user code.
- Programmable/dynamic build logic and computed workspace lists are not expanded.
- Xcode metadata is only used when safely readable; full `.pbxproj` evaluation and
  scheme inheritance are intentionally unsupported.
- Bazel macros, Starlark execution, Make variable expansion, Gradle code, and
  generated manifests require explicit plugin detectors or overrides.
- Remote package dependencies remain external unless a local project with matching
  manifest identity exists.
- Kubernetes/service image matching is conservative and will not invent runtime
  service discovery.
- Synchronous `analyze()` skips asynchronous custom project detectors with a
  diagnostic.
