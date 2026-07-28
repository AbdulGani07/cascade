# Java and Kotlin language support

Cascade's first-party JVM plugins use Tree-sitter concrete syntax trees. Import extraction is
restricted to grammar nodes (`import_declaration` for Java and `import` for Kotlin);
regular expressions are used only inside already-classified syntax nodes or structured build
files. Build scripts are never executed.

## Java capability matrix

| Capability                                          | Status    | Strategy                                                        |
| --------------------------------------------------- | --------- | --------------------------------------------------------------- |
| `.java`, packages, explicit/static/wildcard imports | Supported | Tree-sitter Java                                                |
| Parse diagnostics and symbol declarations           | Supported | Error/missing syntax nodes                                      |
| Package/type resolution across modules              | Supported | Declared-package source index                                   |
| JDK modules                                         | Supported | `java`, `javax`, and `jdk` namespaces                           |
| Maven and Gradle dependencies                       | Supported | POM and Gradle coordinate metadata                              |
| Maven/Gradle multi-module repositories              | Supported | Repository-wide source/build indexes                            |
| JPMS                                                | Detected  | `module-info.java`; directive edges are currently metadata-only |
| `public static void main` and Spring Boot           | Supported | Syntax-preserving source inspection                             |
| JUnit/test roots                                    | Supported | Source-set and naming conventions                               |
| Generated sources                                   | Supported | Maven/Gradle paths and generated markers                        |
| Fully qualified references                          | Partial   | Only when safe, explicit evidence exists                        |

## Kotlin capability matrix

| Capability                                | Status                | Strategy                                 |
| ----------------------------------------- | --------------------- | ---------------------------------------- |
| `.kt`, `.kts`, packages, imports, aliases | Supported             | Tree-sitter Kotlin                       |
| Parse diagnostics and declarations        | Supported             | Error/missing syntax nodes               |
| Kotlin/JVM package/type resolution        | Supported             | Declared-package source index            |
| Gradle Kotlin DSL                         | Supported as metadata | Static plugin/dependency inspection      |
| Android                                   | Detected              | Android Gradle plugin and source sets    |
| Kotlin Multiplatform                      | Detected              | Plugin metadata and platform source sets |
| Top-level `main` and scripts              | Supported             | Structured source plus file role         |
| Test source sets                          | Supported             | JVM, Android, and common test layouts    |
| Generated KSP/kapt/build sources          | Supported             | Paths and generated markers              |

## Accuracy safeguards

- Unmatched imports remain unresolved and carry a language-specific diagnostic.
- Ambiguous package/type matches are not silently selected.
- Every resolution includes confidence and evidence.
- Gradle scripts are inspected but never executed; dynamic declarations remain unresolved.
- Cross-project JVM edges are created only from matching declared source packages/types.
- Reflection, custom class loaders, arbitrary Gradle logic, and compiler-plugin outputs that have
  not yet been generated are documented limitations rather than inferred edges.

## Build metadata and mixed-language repositories

Java and Kotlin source indexes span the known repository file set, so an import can resolve to
another Maven/Gradle module. Kotlin/JVM and Java can coexist in the same build; however, a
cross-language edge must be backed by an explicit import and a uniquely matching declared type.
Shared integration code is responsible for registering both plugins and presenting build/module
grouping in the result and dashboard.

## Benchmarks

The plugins participate in Cascade's generated small, medium, and large benchmark harness once
registered by the root integration. Parser and resolver caches are scoped to an analysis run by
the core. The JVM fixtures cover Maven multi-module, Spring Boot, JPMS, JUnit, Gradle Kotlin DSL,
Android metadata, Kotlin Multiplatform source sets, aliases, entry points, and tests.
