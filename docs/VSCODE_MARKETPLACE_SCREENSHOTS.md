# VS Code Marketplace screenshot capture

Use only the real Cascade prerelease and the committed
[`examples/vscode-extension-demo`](../examples/vscode-extension-demo) workspace. Do not edit
counts, diagnostics, labels, or other UI after capture.

## Clean capture profile

From the repository root, the owner can prepare the exact package and isolated profile with:

```powershell
.\scripts\prepare-vscode-marketplace-screenshots.ps1
```

The helper builds the extension, packages `3.3.1` with VSCE prerelease metadata, creates isolated
user-data and extension directories under the operating system's temporary directory, installs
that exact VSIX, opens the committed demo workspace, and prints the checklist below. It does not
capture or alter screenshots.

1. Build and inspect the intended prerelease VSIX.
2. Create empty temporary directories outside the repository for VS Code user data and extensions.
3. Install the VSIX into that isolated profile:

   ```powershell
   code --user-data-dir "<temporary-user-data>" --extensions-dir "<temporary-extensions>" `
     --install-extension "<absolute-path-to-reviewed-vsix>" --force
   ```

4. Open `examples/vscode-extension-demo` with the same `--user-data-dir` and `--extensions-dir`.
5. Use the default Dark Modern theme, 100% zoom, a 1440×900 window, and no unrelated extensions.
6. Hide Accounts, notifications, source-control remotes, terminal paths, and OS-specific title-bar
   details. Never capture the dashboard token or a local absolute path.

## Required captures

Save real PNG captures under `packages/vscode-extension/media/screenshots/`. PNGs are intentionally
not referenced by the Marketplace README until an owner has captured and reviewed them.

| File                     | State to capture                                                                                                                   | Accessible alt text                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `extension-overview.png` | Extensions view on the installed Cascade prerelease, showing publisher, prerelease badge, and README introduction                  | Cascade Code Intelligence prerelease overview in VS Code                         |
| `codelens-impact.png`    | Open `src/orders.ts`, run **Cascade: Refresh Workspace**, then show the real dependency and affected CodeLens above the first line | Cascade CodeLens showing dependency and transitive impact counts above orders.ts |
| `cycle-diagnostic.png`   | Run **Cascade: Analyze Current File** in `src/orders.ts`; show the real cycle diagnostic in the editor and Problems panel          | Cascade cycle diagnostic for the orders and pricing dependency loop              |
| `affected-tests.png`     | In `src/orders.ts`, run **Cascade: Show Affected Tests** and capture the real Quick Pick containing `tests/orders.test.ts`         | Cascade affected-test candidates for orders.ts                                   |
| `local-dashboard.png`    | Run **Cascade: Open Dashboard**; crop browser chrome and the tokenized URL, retaining only the real local dashboard                | Cascade local dashboard visualizing the screenshot workspace dependency graph    |
| `multi-root.png`         | Optional: add a second copy of the demo as a workspace folder and show Cascade health for both roots                               | Cascade status for two local workspace folders                                   |

## Review checklist

- Exact canvas size is 1440×900; do not upscale.
- Text remains readable at Marketplace display width.
- No usernames, home directories, access tokens, private repositories, notifications, or unrelated
  tabs are visible.
- The extension ID is `cascade-code.cascade-code-intelligence` and the shown version is the version
  being uploaded.
- CodeLens, diagnostic, affected-test, and dashboard states come from Cascade itself.
- Alt text from the table is used verbatim when adding approved images to the README.
- After approval, add only the existing reviewed files to the README and run
  `pnpm --filter cascade-code-intelligence package:validate`.
