# Project and workspace intelligence

Updated: 2026-07-28 15:02 +06:00

Cascade 3.1 adds a deterministic, language-neutral project graph alongside the
file graph. Nodes represent workspaces, packages, modules, applications,
libraries, services, tests, generated-output owners, and deployment units when
manifest or configuration evidence exists. Configuration is metadata, never an
ordinary source-file import.

## Typed relationship model

| Relationship                            | Evidence                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `workspace-depends-on`, `packages`      | npm/pnpm/Yarn workspace metadata                                               |
| `build-depends-on`, `references`        | Maven, Gradle, .NET, Go, Cargo, CMake, Meson, Bazel, Terraform module metadata |
| `runtime-depends-on`, `test-depends-on` | production and development package declarations                                |
| `generates`                             | generated-output and structured build evidence                                 |
| `deploys`                               | Docker, Compose, Kubernetes image/service evidence                             |
| `extends-configuration`                 | literal configuration inheritance                                              |

Each relationship carries confidence, source files, and evidence. Missing targets
are not guessed. Conflicting detectors emit `PROJECT_DEFINITION_CONFLICT`.

## Detection and build-system matrix

| Ecosystem             | Supported metadata                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------- |
| JavaScript/TypeScript | `package.json`, npm/pnpm/Yarn workspaces, Turborepo, Nx, Rush, Lerna, Vite, Next.js, NestJS |
| Python                | `pyproject.toml`, Poetry, uv, PDM, Hatch, setup metadata                                    |
| Java/Kotlin           | Maven, Gradle, multi-module, Android                                                        |
| C#                    | `.sln`, `.csproj`, project references                                                       |
| Go/Rust               | `go.mod`, `go.work`, `Cargo.toml`, Cargo workspaces                                         |
| C/C++                 | CMake, Make, Meson, Bazel where statically readable                                         |
| Mobile                | Android Gradle, Flutter/Dart, SwiftPM, safely readable Xcode metadata                       |
| Deployment            | Dockerfile, Compose, Kubernetes, Terraform, GitHub Actions, GitLab CI, generic CI           |

## CLI and configuration

```bash
node packages/cli/dist/index.js projects path/to/repository
node packages/cli/dist/index.js projects path/to/repository --project apps/web
node packages/cli/dist/index.js graph path/to/repository --project --json
```

```json
{
  "selectedProjects": ["apps/web"],
  "projectOverrides": {
    "apps/web": { "name": "web", "projectType": "service" }
  }
}
```

## Example polyglot result

```json
{
  "from": "apps/web",
  "to": "packages/shared",
  "type": "runtime-depends-on",
  "evidence": ["package.json dependencies declares '@poly/shared'"],
  "sourceFiles": ["apps/web/package.json"]
}
```

Project impact follows reverse typed relationships and reports affected projects
and directly owned files. Package cycles use the project graph adjacency index.

## Performance and limitations

Discovery performs one bounded deterministic metadata walk and indexes projects
by ID, name, and root path. The 100-workspace-package benchmark completed in
243.5 ms on the development machine. Cascade does not execute build tools, package
managers, Terraform, CI jobs, Docker builds, or Xcode. Programmable build logic,
runtime service discovery, and generated files absent from disk remain explicit
limitations rather than invented relationships.
