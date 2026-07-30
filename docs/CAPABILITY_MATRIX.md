# Language capability matrix

This matrix describes implemented behavior in the 3.3.1-next.0 first-party plugins.
“Yes” means the plugin exposes that capability; depth and accuracy still depend
on syntax and repository layout.

| Language      | Level         | Dependencies                                  | Symbols | Project/build evidence                              | Notable limits                                                  |
| ------------- | ------------- | --------------------------------------------- | ------- | --------------------------------------------------- | --------------------------------------------------------------- |
| JavaScript    | Structured    | import/export, require, dynamic import        | Yes     | package/workspace and framework evidence            | Runtime-computed specifiers remain unresolved                   |
| TypeScript    | Structured    | JS forms plus type-only imports/re-exports    | Yes     | tsconfig paths and package metadata                 | Does not perform full TypeScript type checking                  |
| Python        | Syntax-aware  | import/from, relative/package resolution      | Limited | pyproject and common framework/source layouts       | Dynamic imports and path mutation are conservative              |
| Java          | Structured    | imports, packages, JPMS-related evidence      | Yes     | Maven/Gradle, Spring/JUnit evidence                 | Annotation processing and build execution are not run           |
| Kotlin        | Structured    | imports/packages                              | Yes     | Gradle Kotlin, Android, multiplatform evidence      | Compiler plugins and generated sources are not executed         |
| C#            | Structured    | using, namespace/type and project references  | Yes     | `.sln`, `.csproj`, ASP.NET/test evidence            | MSBuild conditions and generators are not evaluated             |
| Go            | Structured    | imports and module paths                      | Yes     | `go.mod`, `go.work`, replace/internal/test evidence | Build tags and generated code may change the effective graph    |
| Rust          | Structured    | `mod`, `use`, crate/include forms             | Yes     | Cargo package/workspace evidence                    | Macro expansion and build scripts are not executed              |
| C             | Structured    | preprocessor includes                         | Limited | CMake/Make/Meson/Bazel metadata                     | Preprocessor conditions and generated headers are not evaluated |
| C++           | Structured    | includes and C++ syntax                       | Limited | CMake/native project evidence                       | Templates, modules, and compile commands are not fully modeled  |
| PHP           | Syntax-aware  | include/require/use forms                     | Limited | Composer evidence                                   | Runtime includes remain unresolved                              |
| Ruby          | Syntax-aware  | require/require_relative                      | Limited | Gem metadata                                        | Load-path mutation and metaprogramming are not executed         |
| Swift         | Syntax-aware  | import evidence                               | Limited | Package metadata evidence                           | Module-to-file resolution is limited                            |
| Dart          | Syntax-aware  | import/export/part evidence                   | Limited | pubspec package evidence                            | Generated packages are not executed                             |
| Shell         | Pattern-based | source/dot includes                           | No      | Script evidence                                     | Variable-expanded paths are unresolved                          |
| PowerShell    | Pattern-based | module/script imports                         | No      | Module metadata evidence                            | Dynamic command construction is not executed                    |
| Lua           | Pattern-based | require/load evidence                         | No      | File evidence                                       | Custom package paths are limited                                |
| R             | Pattern-based | source/library evidence                       | No      | Project evidence                                    | Runtime library state is external                               |
| Vue           | Component     | script imports and component/style references | Limited | Web project evidence                                | Template/compiler transformations are partial                   |
| Svelte        | Component     | script/style imports                          | Limited | Web project evidence                                | Preprocessor output is not executed                             |
| HTML          | Document      | script, stylesheet, asset references          | No      | Web project evidence                                | Runtime DOM injection is outside static analysis                |
| CSS/Sass/Less | Asset         | import/url references                         | No      | Web asset evidence                                  | Preprocessor variables can obscure targets                      |
| GraphQL       | Document      | `#import` evidence                            | No      | Schema/query assets                                 | Tool-specific loaders vary                                      |
| SQL           | Optional      | selected reference patterns                   | No      | Database assets                                     | Disabled by default; not a semantic SQL analyzer                |

## Analysis levels in output

Plugin manifests include `analysisLevels`, `capabilities`, and `limitations`.
Use these fields when deciding whether a finding is strong enough for policy.
Do not infer equal confidence merely because two files have resolved edges.

## Fixtures

Regression fixtures under `tests/fixtures` cover JavaScript/TypeScript, Python,
JVM, C#, Go, Rust, native projects, expanded formats, and a polyglot monorepo.
See [Examples](EXAMPLES.md) for commands verified against those fixtures.
