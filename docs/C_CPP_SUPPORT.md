# C and C++ language support

Updated: 2026-07-28 14:00 +06:00

Cascade's first-party C and C++ plugins use `tree-sitter-c` and `tree-sitter-cpp`.
Includes and declarations come from syntax-tree nodes, not regular-expression-only
source scanning. CMake, Make, Meson, and Bazel files are treated as structured build
evidence; Cascade does not execute user build programs.

## Analysis levels

Both plugins declare:

- **File dependency:** preprocessor include edges and resolved header/source files.
- **Symbol dependency:** declarations discovered from syntax-tree nodes. This is not
  compiler-grade name lookup.
- **Build dependency:** statically identifiable CMake, Make, Meson, and Bazel project
  grouping. Arbitrary build-language execution is outside the analysis.

Neither plugin claims module-level semantic resolution or runtime dynamic dependency
analysis. C++20 named modules remain a documented limitation.

## C capability matrix

| Area          | Behavior                                               | Status                              |
| ------------- | ------------------------------------------------------ | ----------------------------------- |
| Files         | `.c`, `.h`                                             | Supported                           |
| Parsing       | Error-tolerant concrete syntax tree                    | Tree-sitter C                       |
| Dependencies  | Quoted and angle-bracket `#include`                    | Supported                           |
| Resolution    | Importer-relative headers                              | Supported                           |
| Resolution    | Unique repository include suffix                       | Supported, 0.86 confidence          |
| Resolution    | System headers                                         | External standard-library edge      |
| Resolution    | Missing/ambiguous headers                              | Diagnostic; never silently resolved |
| Symbols       | Functions, structures, enumerations                    | File-level declarations             |
| Entry points  | Concrete `main` function definition                    | Supported                           |
| Tests         | Test folders and `_test.c`/`.test.c`                   | Supported                           |
| Generated     | Build, vendor, generated folders and generated headers | Supported                           |
| Build systems | CMake, Make, Meson, Bazel                              | Detection and grouping              |
| Diagnostics   | Malformed syntax and failed resolution                 | Supported                           |
| Confidence    | Per-edge confidence and evidence                       | Supported                           |

## C++ capability matrix

| Area          | Behavior                                               | Status                  |
| ------------- | ------------------------------------------------------ | ----------------------- |
| Files         | `.cc`, `.cpp`, `.cxx`, `.c++`                          | Supported               |
| Headers       | `.hh`, `.hpp`, `.hxx`, `.h++`, `.ipp`, `.tpp`          | Supported               |
| Parsing       | Error-tolerant concrete syntax tree                    | Tree-sitter C++         |
| Dependencies  | Quoted and angle-bracket `#include`                    | Supported               |
| Resolution    | Importer-relative and unique repository header matches | Supported               |
| Symbols       | Functions, classes, structs, enums, namespaces         | File-level declarations |
| Entry points  | Concrete `main` function definition                    | Supported               |
| Tests         | Test folders and conventional test suffixes            | Supported               |
| Generated     | Build, Bazel, vendor, third-party, generated folders   | Supported               |
| Build systems | CMake, Make, Meson, Bazel                              | Detection and grouping  |
| Diagnostics   | Malformed syntax and failed resolution                 | Supported               |
| Confidence    | Per-edge confidence and evidence                       | Supported               |

## Resolution and cross-language safeguards

Quoted headers first resolve relative to the importing file. If that fails, Cascade
accepts only a unique repository suffix match and lowers confidence because a configured
compiler include path was not available. Multiple matches produce an ambiguity diagnostic.
Angle-bracket includes remain external rather than being guessed.

The resolver considers every known repository file, so a C source can resolve a C++
header and vice versa when the include itself is explicit. This is an evidence-based
cross-language file edge. Cascade does not infer linker, FFI, generated-client, or
native-module edges from naming conventions.

## Known limitations

- Preprocessor conditions, macro-expanded include names, compiler flags, sysroots, and
  toolchain include paths are not evaluated.
- Header resolution does not reproduce a particular compiler's complete include search
  order unless the target is importer-relative or unique in the repository.
- C++ templates, concepts, overload resolution, argument-dependent lookup, and modules
  require a configured compiler frontend and are not claimed.
- CMake, Make, Meson, and Bazel are programmable. Cascade detects their files and safely
  readable relationships but does not execute them.
- Linker inputs, `dlopen`, platform loader APIs, and generated sources that do not yet
  exist on disk cannot be converted into source-file edges.
- Symbol extraction is declaration inventory, not complete semantic binding.

## Fixtures and regression tests

Fixtures cover a CMake C executable/library, a multi-directory C++ project, local and
system includes, cross-directory resolution, tests, generated files, malformed source,
unresolved headers, and CMake/Make/Meson/Bazel metadata. Paths are normalized before
matching so Windows separators and POSIX separators behave consistently.

The package benchmarks parse synthetic include lists through the production Tree-sitter
paths:

| Language | Includes | Extracted edges |      Time |
| -------- | -------: | --------------: | --------: |
| C        |      100 |             100 |  16.69 ms |
| C        |    1,000 |           1,000 |  39.84 ms |
| C        |    5,000 |           5,000 | 154.64 ms |
| C++      |      100 |             100 |   5.35 ms |
| C++      |    1,000 |           1,000 |  47.16 ms |
| C++      |    5,000 |           5,000 | 130.49 ms |

Results were recorded on 2026-07-28 on the development machine and are comparative,
not a cross-machine SLA.
