[CmdletBinding()]
param(
  [string]$SourceDir = "$env:USERPROFILE\Downloads\RadPrimer",
  [string]$DestinationDir = "$env:APPDATA\Anki2\User 1\collection.media",
  [int]$PollingSeconds = 1
)

$ErrorActionPreference = "Stop"

$logName = "_radprimer_anki_watcher.log"
$imageExtensions = @(".jpg", ".jpeg", ".png", ".gif", ".webp")
$copied = @{}

function Write-WatcherLog {
  param([string]$Message)

  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Message
  Write-Host $line
  Add-Content -LiteralPath (Join-Path $SourceDir $logName) -Value $line
}

function Test-ImageFile {
  param([System.IO.FileInfo]$File)

  if (-not $File) { return $false }
  if ($File.Name -like "*.crdownload") { return $false }
  return $imageExtensions -contains $File.Extension.ToLowerInvariant()
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

function Copy-ImageToAnki {
  param(
    [System.IO.FileInfo]$File
  )

  if (-not (Test-ImageFile $File)) { return }
  if (-not (Wait-ForStableFile -Path $File.FullName)) {
    Write-WatcherLog "Skipped unstable file: $($File.Name)"
    return
  }

  $fresh = Get-Item -LiteralPath $File.FullName
  $signature = "{0}|{1}|{2}" -f $fresh.Name, $fresh.Length, $fresh.LastWriteTimeUtc.Ticks
  $destination = Join-Path $DestinationDir $fresh.Name

  if ($copied[$fresh.Name] -eq $signature -and (Test-Path -LiteralPath $destination)) {
    return
  }

  Copy-Item -LiteralPath $fresh.FullName -Destination $destination -Force
  $copied[$fresh.Name] = $signature
  Write-WatcherLog "Copied to Anki media: $($fresh.Name)"
}

New-Item -ItemType Directory -Path $SourceDir -Force | Out-Null
New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null

Write-WatcherLog "Watching RadPrimer images in: $SourceDir"
Write-WatcherLog "Copying enabled runs into: $DestinationDir"
Write-WatcherLog "Leave this window open while running RadPrimer image downloads. Press Ctrl+C to stop."

while ($true) {
  Get-ChildItem -LiteralPath $SourceDir -File |
    Where-Object { Test-ImageFile $_ } |
    ForEach-Object { Copy-ImageToAnki -File $_ }

  Start-Sleep -Seconds $PollingSeconds
}
