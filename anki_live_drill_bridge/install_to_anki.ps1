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

# Preserve existing installed code before updating this one add-on.
$backupDir = Join-Path (Split-Path -Parent $PSScriptRoot) ("corebook_card_registry\install_backup\" + (Get-Date -Format "yyyyMMdd-HHmmss"))
foreach ($name in @("__init__.py", "corebook_registry.py", "corebook_config.json")) {
  $existing = Join-Path $targetDir $name
  if (Test-Path -LiteralPath $existing) {
    New-Item -ItemType Directory -Force -Path $backupDir | Out-Null
    Copy-Item -LiteralPath $existing -Destination (Join-Path $backupDir $name)
  }
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item -LiteralPath $source -Destination $target -Force
$registryModule = Join-Path $PSScriptRoot "anki_addon\corebook_registry.py"
Copy-Item -LiteralPath $registryModule -Destination (Join-Path $targetDir "corebook_registry.py") -Force
$registryPath = Join-Path (Split-Path -Parent $PSScriptRoot) "corebook_card_registry\data"
$registryConfig = @{ registryPath = $registryPath } | ConvertTo-Json
[System.IO.File]::WriteAllText((Join-Path $targetDir "corebook_config.json"), $registryConfig, (New-Object System.Text.UTF8Encoding($false)))

if (Test-Path -LiteralPath $assetSource) {
  New-Item -ItemType Directory -Force -Path $assetTargetDir | Out-Null
  Copy-Item -LiteralPath $assetSource -Destination $assetTarget -Force
} else {
  Write-Warning "Skull locator asset not found: $assetSource"
}

Write-Host "Installed IMAIOS Live Drill Bridge to $targetDir"
Write-Host "Restart Anki if it was already open."
