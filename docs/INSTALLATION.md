# Installation

## Requirements

- Node.js 22.13 or newer
- pnpm 9.15.0 through Corepack
- Git for change-impact commands

## Repository installation

Cascade is not currently published under a verified npm package name. Install
from source:

```bash
git clone https://github.com/AbdulGani07/cascade.git
cd cascade
corepack enable
pnpm install --frozen-lockfile
pnpm build
node packages/cli/dist/index.js --version
```

Expected version:

```text
3.3.0
```

For convenience, define a shell alias:

```bash
alias cascade='node /absolute/path/to/cascade/packages/cli/dist/index.js'
```

PowerShell:

```powershell
function cascade { node D:\path\to\cascade\packages\cli\dist\index.js @args }
```

## Development installation

```bash
pnpm install --frozen-lockfile
pnpm check
```

Native Tree-sitter packages are normal Cascade dependencies. An analyzed
repository's dependencies are never installed by Cascade.

## VS Code extension package

```bash
pnpm --dir packages/vscode-extension run package:validate
pnpm --dir packages/vscode-extension run package
```

Install the generated `.vsix` with **Extensions: Install from VSIX…**. See
[VS Code extension](VSCODE_EXTENSION.md).

## Verify the environment

```bash
node packages/cli/dist/index.js doctor .
```

Continue with [Getting started](GETTING_STARTED.md).
