# C# language support

Cascade's first-party C# plugin uses the `tree-sitter-c-sharp` grammar. Source files are parsed
into syntax trees; `using` directives, namespace/type declarations, entry points, symbols, and
syntax errors are obtained from named AST nodes. It is not a regular-expression source scanner.
Small regular expressions are used only after an AST node has isolated a `using` directive, and
for structured MSBuild XML attributes.

## Capability matrix

| Capability                       | Support                 | Evidence and behavior                                                      |
| -------------------------------- | ----------------------- | -------------------------------------------------------------------------- |
| `.cs` files                      | Full                    | Extension detection and Tree-sitter parsing                                |
| Block/file-scoped namespaces     | Full                    | Namespace declaration AST nodes                                            |
| `using`, aliases, `using static` | Full                    | `using_directive` AST nodes                                                |
| Global usings                    | Full                    | Global `using_directive` syntax and evidence                               |
| Fully qualified references       | Safe subset             | Object-creation type AST nodes only                                        |
| Namespace/type resolution        | High confidence         | Repository namespace/type index                                            |
| `.csproj`, `.sln`                | Metadata-aware          | SDK, project, package, and assembly references                             |
| SDK-style projects               | Full metadata detection | MSBuild project XML                                                        |
| Project references               | Partial resolution      | Referenced project recorded; source namespace must be present              |
| Assembly/package references      | Classification          | Classified external when declared                                          |
| `static Main`                    | Full                    | Method AST node                                                            |
| Top-level statements             | Full                    | Compilation-unit global statement AST node                                 |
| ASP.NET Core                     | Detection               | Web SDK and ASP.NET references                                             |
| Test projects/files              | Detection               | Test directories and `Tests`/`Specs` filename conventions                  |
| Generated files                  | Detection               | `obj`, `bin`, generated folders/suffixes and auto-generated marker         |
| Parse diagnostics                | Full                    | Tree-sitter error/missing nodes and locations                              |
| Resolution diagnostics           | Full                    | Ambiguous and unresolved namespace diagnostics                             |
| Confidence/evidence              | Full                    | Every extracted and resolved edge includes both                            |
| Cross-language edges             | Evidence-only           | Capability is declared; shared core must create only metadata-backed edges |

## Build-system and cross-project behavior

The resolver inspects all `.csproj` files below the analysis root. `ProjectReference`,
`PackageReference`, and assembly `Reference` items influence classification. Solution and project
metadata is exposed through the framework provider for module/build grouping. A source namespace
is resolved only when a matching declaration is present; otherwise the relationship remains
external, ambiguous, or unresolved rather than being invented.

Parsed namespace/type facts are cached by absolute path and modification time, so resolving many
edges does not repeatedly parse every source file. The shared graph layer remains responsible for
its adjacency and reverse-adjacency indexes.

## Known limitations

- Cascade does not execute MSBuild, restore NuGet packages, or evaluate every conditioned property.
- Namespace visibility is not identical to an assembly dependency; ambiguous namespace matches stay
  ambiguous.
- Reflection, runtime dependency injection, generated source execution, and dynamically loaded
  assemblies cannot be inferred reliably.
- Target-framework-specific global usings and source generated types require their emitted files to
  be present.
- Cross-language native/generated-client edges require explicit build metadata and shared-core
  integration; filename similarity is never treated as evidence.

## Fixtures

`tests/fixtures/csharp/dotnet-solution` covers an SDK-style multi-project solution, project and
package references, top-level statements, internal/framework/external/unresolved namespaces.
`tests/fixtures/csharp/aspnet` covers an ASP.NET Core app, tests, and generated `obj` output.

After building the package, run `pnpm --filter @cascade/language-csharp benchmark`. The benchmark
parses and extracts 100, 1,000, and 5,000 AST-backed using directives and emits machine-readable
timings. It intentionally lives beside the plugin so the repository benchmark runner can aggregate
it without coupling the language implementation to shared-core wiring.
