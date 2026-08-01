[CmdletBinding()]
param(
  [string]$CodeCommand = "code"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")).Path
$extensionRoot = Join-Path $repositoryRoot "packages\vscode-extension"
$demoRoot = Join-Path $repositoryRoot "examples\vscode-extension-demo"
$vsix = Join-Path $extensionRoot "cascade-code-intelligence-3.3.1-win32-x64-prerelease.vsix"
$profileRoot = Join-Path ([System.IO.Path]::GetTempPath()) (
  "cascade-vscode-capture-" + [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
)
$userData = Join-Path $profileRoot "user-data"
$extensions = Join-Path $profileRoot "extensions"

New-Item -ItemType Directory -Path $userData, $extensions -Force | Out-Null

Push-Location $repositoryRoot
try {
  & pnpm --filter cascade-code-intelligence package:prerelease
  if ($LASTEXITCODE -ne 0) { throw "Prerelease packaging failed with exit code $LASTEXITCODE." }
} finally {
  Pop-Location
}

if (-not (Test-Path -LiteralPath $vsix -PathType Leaf)) {
  throw "Expected VSIX was not created: $vsix"
}

& $CodeCommand --user-data-dir $userData --extensions-dir $extensions `
  --install-extension $vsix --force
if ($LASTEXITCODE -ne 0) { throw "VSIX installation failed with exit code $LASTEXITCODE." }

& $CodeCommand --user-data-dir $userData --extensions-dir $extensions `
  --new-window $demoRoot
if ($LASTEXITCODE -ne 0) { throw "Opening the demo workspace failed with exit code $LASTEXITCODE." }

Write-Host ""
Write-Host "Isolated capture profile: $profileRoot"
Write-Host "Installed VSIX: $vsix"
Write-Host ""
Write-Host "Capture in this order at 1440x900, Dark Modern, 100% zoom:"
Write-Host "1. extension-overview.png - installed prerelease overview"
Write-Host "2. codelens-impact.png - refresh workspace, then open src/orders.ts"
Write-Host "3. cycle-diagnostic.png - analyze src/orders.ts and show Problems"
Write-Host "4. affected-tests.png - show affected tests for src/orders.ts"
Write-Host "5. local-dashboard.png - crop browser chrome and tokenized URL"
Write-Host "6. multi-root.png - optional multi-root health view"
Write-Host ""
Write-Host "Review every image for usernames, absolute paths, tokens, notifications,"
Write-Host "unrelated extensions, and private repository details before approval."
