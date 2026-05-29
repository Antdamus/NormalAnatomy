[CmdletBinding()]
param(
  [string]$SourceDir = "$env:USERPROFILE\Downloads\RadPrimerAudit",
  [string]$DestinationDir = "$env:USERPROFILE\NormalAnatomy\radprimer_audit_queue",
  [int]$PollingSeconds = 1
)

$ErrorActionPreference = "Stop"

$logName = "_radprimer_audit_watcher.log"
$copied = @{}

function Write-WatcherLog {
  param([string]$Message)

  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -LiteralPath (Join-Path $SourceDir $logName) -Value $line
}

function Test-CopyCandidate {
  param([System.IO.FileInfo]$File)

  if (-not $File) { return $false }
  if ($File.Name -like "*.crdownload") { return $false }
  if ($File.Name -eq $logName) { return $false }
  return $true
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

function Copy-AuditFile {
  param([System.IO.FileInfo]$File)

  if (-not (Test-CopyCandidate $File)) { return }
  if (-not (Wait-ForStableFile -Path $File.FullName)) {
    Write-WatcherLog "Skipped unstable file: $($File.FullName)"
    return
  }

  $fresh = Get-Item -LiteralPath $File.FullName
  $relative = [System.IO.Path]::GetRelativePath($SourceDir, $fresh.FullName)
  $destination = Join-Path $DestinationDir $relative
  $destinationParent = Split-Path -Parent $destination
  $signature = "{0}|{1}|{2}" -f $relative, $fresh.Length, $fresh.LastWriteTimeUtc.Ticks

  if ($copied[$relative] -eq $signature -and (Test-Path -LiteralPath $destination)) {
    return
  }

  New-Item -ItemType Directory -Path $destinationParent -Force | Out-Null
  Copy-Item -LiteralPath $fresh.FullName -Destination $destination -Force
  $copied[$relative] = $signature
  $bundleName = $relative.Split([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)[0]
  $completeMarker = if ($bundleName) { Join-Path (Join-Path $DestinationDir $bundleName) "_bundle_complete.txt" } else { $null }
  if ($bundleName -and $completeMarker -and (Test-Path -LiteralPath $completeMarker)) {
    Set-Content -LiteralPath (Join-Path $DestinationDir "_latest_radprimer_audit_bundle.txt") -Value (Join-Path $DestinationDir $bundleName)
  }
  Write-WatcherLog "Copied audit file: $relative"
}

New-Item -ItemType Directory -Path $SourceDir -Force | Out-Null
New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null

Write-WatcherLog "Watching RadPrimer audit bundles in: $SourceDir"
Write-WatcherLog "Mirroring audit bundles into: $DestinationDir"
Write-WatcherLog "Leave this window open while running card audit capture. Press Ctrl+C to stop."

while ($true) {
  Get-ChildItem -LiteralPath $SourceDir -File -Recurse |
    Where-Object { Test-CopyCandidate $_ } |
    ForEach-Object { Copy-AuditFile -File $_ }

  Start-Sleep -Seconds $PollingSeconds
}
