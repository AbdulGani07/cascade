$ErrorActionPreference = "Stop"
$repo = Resolve-Path (Join-Path $PSScriptRoot "../../..")
Set-Location $repo

node examples/cascade-commerce/scripts/setup-demo.mjs
node packages/cli/dist/index.js analyze .cascade-demo --compact --no-color
if ($LASTEXITCODE -notin @(0, 1)) { exit $LASTEXITCODE }

node packages/cli/dist/index.js impact .cascade-demo --file packages/contracts/src/order.ts --json
node packages/cli/dist/index.js diff .cascade-demo --base demo-base --head pr/new-cycle --format terminal
node packages/cli/dist/index.js affected-tests .cascade-demo --base demo-base --head pr/new-cycle --format terminal
node packages/cli/dist/index.js governance .cascade-demo --format terminal

node examples/cascade-commerce/scripts/fix-architecture.mjs
node packages/cli/dist/index.js governance .cascade-demo --format terminal
