param(
  [string]$DownloadRoot = "$env:USERPROFILE\Downloads\IMAIOSLabelRepository",
  [string]$Destination = "$PSScriptRoot\..\..\imaios_label_repository\labels.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $DownloadRoot)) {
  throw "IMaios label repository download folder was not found: $DownloadRoot"
}

$latest = Join-Path $DownloadRoot "imaios_label_repository_latest.json"
if (Test-Path -LiteralPath $latest) {
  $source = Get-Item -LiteralPath $latest
} else {
  $snapshotRoot = Join-Path $DownloadRoot "snapshots"
  $source = Get-ChildItem -LiteralPath $snapshotRoot -Filter "imaios_label_repository_*.json" -File -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}

if (-not $source) {
  throw "No IMaios label repository JSON backup was found under $DownloadRoot"
}

$jsonText = Get-Content -LiteralPath $source.FullName -Raw
$parsed = $jsonText | ConvertFrom-Json
if ($parsed.kind -ne "imaios-label-repository") {
  throw "Backup is not an imaios-label-repository JSON file: $($source.FullName)"
}
if (-not $parsed.moduleLabels) {
  throw "Backup has no moduleLabels object: $($source.FullName)"
}

$destinationItem = New-Item -ItemType File -Path $Destination -Force
Set-Content -LiteralPath $destinationItem.FullName -Value $jsonText -Encoding UTF8

$moduleCount = @($parsed.moduleLabels.PSObject.Properties).Count
$labelCount = 0
foreach ($property in $parsed.moduleLabels.PSObject.Properties) {
  if ($property.Value.labels) {
    $labelCount += @($property.Value.labels).Count
  }
}

[pscustomobject]@{
  ImportedFrom = $source.FullName
  Destination = $destinationItem.FullName
  Modules = $moduleCount
  Labels = $labelCount
}
