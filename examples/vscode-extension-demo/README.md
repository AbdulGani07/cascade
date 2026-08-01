# Cascade VS Code screenshot workspace

This deterministic workspace exists only for authentic Marketplace screenshots and editor smoke
tests. It contains a small TypeScript dependency graph, one deliberate cycle, and an affected test.
Cascade analyzes these files as data; the fixture does not need dependency installation or
execution.

Open this directory directly in a clean VS Code profile, install the intended prerelease VSIX, and
follow [the screenshot capture guide](../../docs/VSCODE_MARKETPLACE_SCREENSHOTS.md).
