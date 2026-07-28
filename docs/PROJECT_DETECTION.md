# Project detection

Cascade detects projects from filenames, manifests, source layout, and
first-party plugin evidence. Detection reads metadata; it does not invoke build
tools.

## Detected project families

| Ecosystem             | Evidence                                                   |
| --------------------- | ---------------------------------------------------------- |
| JavaScript/TypeScript | `package.json`, workspaces, common framework metadata      |
| Python                | `pyproject.toml`, `setup.py`, `setup.cfg`, source layout   |
| Java/Kotlin           | Maven POMs, Gradle settings/build files, module layouts    |
| .NET                  | solutions, SDK project files, project references           |
| Go                    | `go.mod`, `go.work`, module/workspace members              |
| Rust                  | `Cargo.toml`, workspace members                            |
| C/C++                 | CMake, Meson, Make, Bazel metadata and source layout       |
| Infrastructure        | Terraform, compose/container and CI configuration evidence |

Projects receive an ID, name, type, role, languages, build system, frameworks,
configuration files, owned files, modules, workspaces, and detection evidence
when available.

## Relationship types

Project edges can represent package dependencies, workspace membership, build
modules, project references, container build contexts, deployment/service
relationships, and CI working directories. Each edge carries confidence,
evidence, and source files.

## Ownership

Files are assigned to the deepest matching detected project. Nested projects
therefore take ownership before repository-root projects. The project graph
includes `fileToProject` and `projectToFiles` indexes plus language, role, build,
and workspace groups.

## Inspect detection

```bash
node packages/cli/dist/index.js projects tests/fixtures/polyglot-monorepo
node packages/cli/dist/index.js projects tests/fixtures/polyglot-monorepo --json
node packages/cli/dist/index.js graph tests/fixtures/polyglot-monorepo --project
```

## Selection and overrides

```json
{
  "selectedProjects": ["services/api"],
  "projectOverrides": {
    "packages/legacy": { "ignore": true },
    "services/gateway": { "name": "Gateway", "projectType": "service" }
  }
}
```

An override that does not match a detected ID produces a diagnostic. Detection
can be incomplete when manifests use executable logic, generated metadata, or
tool-specific extensions.
