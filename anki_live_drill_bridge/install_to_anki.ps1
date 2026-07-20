$ErrorActionPreference = "Stop"

$source = Join-Path $PSScriptRoot "anki_addon\__init__.py"
$assetSource = Join-Path (Split-Path -Parent $PSScriptRoot) "edge_radprimer_extension\assets\skull-locator.png"
$targetDir = Join-Path $env:APPDATA "Anki2\addons21\imaios_live_drill_bridge"
$target = Join-Path $targetDir "__init__.py"
$assetTargetDir = Join-Path $targetDir "assets"
$assetTarget = Join-Path $assetTargetDir "skull-locator.png"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Source add-on file not found: $source"
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item -LiteralPath $source -Destination $target -Force

if (Test-Path -LiteralPath $assetSource) {
  New-Item -ItemType Directory -Force -Path $assetTargetDir | Out-Null
  Copy-Item -LiteralPath $assetSource -Destination $assetTarget -Force
} else {
  Write-Warning "Skull locator asset not found: $assetSource"
}

Write-Host "Installed IMAIOS Live Drill Bridge to $targetDir"
Write-Host "Restart Anki if it was already open."
