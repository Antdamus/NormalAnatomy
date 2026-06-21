$ErrorActionPreference = "Stop"

$source = Join-Path $PSScriptRoot "anki_addon\__init__.py"
$targetDir = Join-Path $env:APPDATA "Anki2\addons21\imaios_live_drill_bridge"
$target = Join-Path $targetDir "__init__.py"

if (-not (Test-Path -LiteralPath $source)) {
  throw "Source add-on file not found: $source"
}

New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
Copy-Item -LiteralPath $source -Destination $target -Force

Write-Host "Installed IMAIOS Live Drill Bridge to $targetDir"
Write-Host "Restart Anki if it was already open."
