[CmdletBinding()]
param(
  [string]$SourceDir = "$env:USERPROFILE\Downloads\RadPrimerAudit",
  [string]$DestinationDir = "$env:USERPROFILE\NormalAnatomy\radprimer_audit_queue"
)

$ErrorActionPreference = "Stop"

function Get-RelativePathCompat {
  param(
    [string]$BasePath,
    [string]$TargetPath
  )

  $baseFull = [System.IO.Path]::GetFullPath($BasePath)
  if (-not $baseFull.EndsWith([System.IO.Path]::DirectorySeparatorChar)) {
    $baseFull = $baseFull + [System.IO.Path]::DirectorySeparatorChar
  }

  $targetFull = [System.IO.Path]::GetFullPath($TargetPath)
  $baseUri = New-Object System.Uri($baseFull)
  $targetUri = New-Object System.Uri($targetFull)
  $relativeUri = $baseUri.MakeRelativeUri($targetUri)
  $relative = [System.Uri]::UnescapeDataString($relativeUri.ToString())

  return $relative.Replace('/', [System.IO.Path]::DirectorySeparatorChar)
}

function Wait-ForStableFile {
  param([string]$Path)

  $lastLength = -1
  for ($i = 0; $i -lt 30; $i++) {
    if (-not (Test-Path -LiteralPath $Path)) {
      Start-Sleep -Milliseconds 250
      continue
    }

    $item = Get-Item -LiteralPath $Path
    if ($item.Length -eq $lastLength) {
      try {
        $stream = [System.IO.File]::Open($Path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::Read)
        $stream.Close()
        return $true
      } catch {
        Start-Sleep -Milliseconds 250
      }
    } else {
      $lastLength = $item.Length
      Start-Sleep -Milliseconds 250
    }
  }

  return $false
}

New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null

if (-not (Test-Path -LiteralPath $SourceDir)) {
  Write-Output "NO_SOURCE"
  exit 0
}

$latest = Get-ChildItem -LiteralPath $SourceDir -Directory |
  Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName "_bundle_complete.txt") } |
  Sort-Object LastWriteTimeUtc -Descending |
  Select-Object -First 1

if (-not $latest) {
  Write-Output "NO_COMPLETE_BUNDLE"
  exit 0
}

$sourceFiles = Get-ChildItem -LiteralPath $latest.FullName -File -Recurse |
  Where-Object { $_.Name -notlike "*.crdownload" }

foreach ($file in $sourceFiles) {
  if (-not (Wait-ForStableFile -Path $file.FullName)) {
    Write-Output "UNSTABLE_BUNDLE"
    exit 0
  }
}

$destinationBundle = Join-Path $DestinationDir $latest.Name
New-Item -ItemType Directory -Path $destinationBundle -Force | Out-Null

foreach ($file in $sourceFiles) {
  $relative = Get-RelativePathCompat -BasePath $latest.FullName -TargetPath $file.FullName
  $destinationFile = Join-Path $destinationBundle $relative
  $destinationParent = Split-Path -Parent $destinationFile
  New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
  Copy-Item -LiteralPath $file.FullName -Destination $destinationFile -Force
}

Set-Content -LiteralPath (Join-Path $DestinationDir "_latest_radprimer_audit_bundle.txt") -Value $destinationBundle
Write-Output $destinationBundle
