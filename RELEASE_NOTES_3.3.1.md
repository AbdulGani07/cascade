# Cascade 3.3.1 release notes

Cascade 3.3.1 is the first fully hardened stable release candidate for the coordinated CLI, analysis
engine, language plugins, reporters, editor service, dashboard, GitHub Action, and VS Code extension.

## Highlights

- Strengthens dependency/change-impact evidence, bounded traversal, repository-root containment,
  symlink handling, native-parser diagnostics, and architecture/affected-test reporting.
- Adds package-specific documentation and package-local license files to all 17 public npm packages;
  release validation now inspects every tarball and performs a clean all-package consumer install.
- Reduces target-specific VSIX installed size from approximately 284.65 MiB to 40.34–43.71 MiB
  while retaining all six commands, bundled local analysis, dashboard, and editor service.
- Adds six offline/local target packages for Windows, Linux, and macOS on x64 and ARM64.
- Hardens dashboard loading, malformed/partial/empty states, oversized-graph behavior, search,
  keyboard access, edge explanations, privacy redaction, and portable export.
- Adds an explicit eight-repository, commit-pinned real-world static-analysis benchmark that never
  executes repository code or install/build scripts.
- Hardens untrusted-repository handling, path validation, archive bounds, localhost service exposure,
  workspace trust, temporary content, GitHub Action permissions, and packaging checks.
- Adds guarded npm and Marketplace publication workflows, live version-state checks, candidate dry
  runs, pinned actions, protected environments, six-target packaging, and size regression enforcement.

## Install and upgrade

After publication:

```bash
npm install --global @cascade-code/cli@3.3.1
cascade --version
```

Install the stable **Cascade Code Intelligence** extension from publisher `cascade-code`, or install
the VSIX matching the host platform. Existing configuration remains compatible; review the privacy,
resource-limit, and workspace-trust guidance before enabling background analysis.

## Known limitations

- Cascade performs static analysis and does not execute builds, generators, macros, repository
  scripts, or dynamic import logic; generated/runtime-only relationships can remain unresolved.
- Bazel/Starlark target semantics and complex MSBuild/Gradle/Maven conditions are partial.
- Large Java repositories remain a performance risk; real-world validation deliberately uses a small
  multi-module sample after larger framework repositories exceeded the isolated analysis timeout.
- Rust macros/features/build scripts, Python path mutation, and contextual `.h` language selection are
  conservative or unsupported.
- Linux/macOS and ARM64 VSIX contents are structurally validated locally; native runtime execution on
  those platforms requires hosted platform jobs before publication approval.
- The dashboard bundle is approximately 501 kB minified and produces Vite's chunk-size advisory, but
  oversized-graph safeguards prevent the previous rendering-freeze risk.

No package, tag, GitHub Release, or Marketplace version was published while preparing these notes.
