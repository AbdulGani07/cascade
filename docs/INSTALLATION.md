# Installation

## Requirements

- Node.js 22.13 or newer
- Git for change-impact commands

## Public prerelease

Install the public prerelease from the `next` channel:

```bash
npm install --global @cascade-code/cli@next
cascade --version
```

The expected prerelease version is:

```text
3.3.1-next.0
```

## Repository installation

Development from source additionally requires pnpm 9.15.0 through Corepack:

```bash
git clone https://github.com/AbdulGani07/cascade.git
cd cascade
corepack enable
pnpm install --frozen-lockfile
pnpm build
node packages/cli/dist/index.js --version
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
