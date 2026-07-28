# Expanded language support: Batches B, C, and D

Updated: 2026-07-28 14:32 +06:00

Cascade 3.0.0 adds first-party plugins for PHP, Ruby, Swift, Dart, shell,
PowerShell, Lua, R, Vue, Svelte, HTML, stylesheets, GraphQL, and opt-in SQL.
They use an error-tolerant structured token tree: comments, strings, identifiers,
punctuation, and source locations are parsed before dependency rules execute.
These plugins are not regular-expression-only scanners and do not claim compiler,
framework-runtime, or language-server equivalence.

## Batch B capability matrix

| Language | Files                      | Dependency evidence                   | Build/project evidence                               | Analysis level                         |
| -------- | -------------------------- | ------------------------------------- | ---------------------------------------------------- | -------------------------------------- |
| PHP      | `.php`                     | `require`, `include`, namespace `use` | Composer                                             | File, module, build, dynamic detection |
| Ruby     | `.rb`, `.rake`, `.gemspec` | `require`, `require_relative`, `load` | Bundler, Rake, Rails conventions                     | File, module, build, dynamic detection |
| Swift    | `.swift`                   | module imports                        | SwiftPM; safely readable Xcode files remain metadata | Module and build                       |
| Dart     | `.dart`                    | imports, exports, parts               | `pubspec.yaml`, Flutter conventions                  | File, module, build                    |

## Batch C capability matrix

| Language   | Files                          | Dependency evidence                    | Analysis level                                 |
| ---------- | ------------------------------ | -------------------------------------- | ---------------------------------------------- |
| Shell      | `.sh`, `.bash`, `.zsh`, `.ksh` | literal `source` and dot-source        | File and runtime-dynamic detection             |
| PowerShell | `.ps1`, `.psm1`, `.psd1`       | literal `Import-Module`, `using`       | File, module, runtime-dynamic detection        |
| Lua        | `.lua`                         | literal `require`, `dofile`            | File, module, runtime-dynamic detection        |
| R          | `.r`, `.R`                     | literal `source`, `library`, `require` | File, module, build, runtime-dynamic detection |

PowerShell paths containing parentheses or special characters must remain quoted:

```powershell
node packages/cli/dist/index.js analyze "tests/fixtures/batch-c/powershell"
```

## Batch D capability matrix

| Format  | Files                             | Dependency evidence                                                 | Analysis level               |
| ------- | --------------------------------- | ------------------------------------------------------------------- | ---------------------------- |
| Vue     | `.vue`                            | literal script imports and `src`/`href` attributes                  | File and module              |
| Svelte  | `.svelte`                         | literal script imports and `src`/`href` attributes                  | File and module              |
| HTML    | `.html`, `.htm`                   | literal `src` and `href` attributes                                 | File                         |
| Styles  | `.css`, `.scss`, `.sass`, `.less` | `@import`, `@use`, `@forward`, literal `url`                        | File                         |
| GraphQL | `.graphql`, `.gql`                | literal `#import`; fragment relationships follow imported documents | File                         |
| SQL     | `.sql`                            | explicit `REFERENCES`, `FROM`, and `JOIN` names                     | Optional file/build evidence |

SQL is disabled by default. Enable it explicitly:

```json
{
  "plugins": [
    {
      "id": "cascade-language-sql",
      "enabled": true,
      "priority": 40
    }
  ]
}
```

SQL table names are never guessed into repository file targets. Migration ordering
is reported only when filenames provide a deterministic order; dialect-specific
schema semantics remain partial.

## Accuracy safeguards

- Resolution succeeds only for an existing importer-relative or repository path.
- Multiple candidates are marked ambiguous; absent targets remain unresolved.
- Bare package/module names remain external rather than being assigned fabricated files.
- Cross-language edges require a literal path and an existing target.
- Generated, vendor, dependency, cache, build, Pods, DerivedData, `.dart_tool`,
  `.bundle`, and R environment directories are excluded.
- Malformed strings and comments produce diagnostics while preserving partial results.
- Every manifest publishes analysis levels and known limitations to JSON, CLI, and dashboard consumers.

## Known limitations

- Package managers, compiler frontends, framework compilers, language servers, and user build scripts are not executed.
- PHP and Ruby metaprogramming, Swift type checking, Dart code generation, shell `eval`,
  PowerShell providers, Lua `package.path` mutation, and R non-standard evaluation are not modeled.
- Vue/Svelte compiler macros and virtual modules are not expanded.
- CSS preprocessor expressions and computed asset URLs are not resolved.
- GraphQL schema validation requires an external schema and is not claimed.
- SQL dialect binding, stored procedures, and dynamic SQL are outside this file-level capability.

## Fixtures and regression coverage

Fixtures under `tests/fixtures/batch-b`, `batch-c`, and `batch-d` cover local and
external dependencies, malformed input, package manifests, special-character
paths, component/style/document edges, GraphQL imports, and opt-in SQL nodes.

## Performance results

The production benchmark on the Windows development machine parsed and extracted
1,000 dependencies in 1.4–15.2 ms across the expanded plugins. The 5,001-file
graph fixture completed in 23,106.9 ms with a 128.1 MB heap delta. Full results
and the reproducible command are recorded in
[the benchmark documentation](../benchmarks/README.md).
