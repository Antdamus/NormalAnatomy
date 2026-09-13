$ErrorActionPreference = 'Stop'
$auditBundle = Split-Path -Parent $PSScriptRoot
$auditMeta = Get-Content -LiteralPath (Join-Path $auditBundle 'metadata.json') -Raw | ConvertFrom-Json
$auditMediaDir = 'C:\Users\josem.000\AppData\Roaming\Anki2\User 1\collection.media'
$auditDownloadDir = 'C:\Users\josem.000\Downloads\RadPrimer'
$auditNames = @($auditMeta.downloadFiles.filename) + @('arrow_WS.png','arrow_WO.png','arrow_WC.png','arrow_CS.png','arrow_BS.png')
$auditResults = foreach ($auditName in ($auditNames | Select-Object -Unique)) {
  $auditPath = Join-Path $auditMediaDir $auditName
  if (-not (Test-Path -LiteralPath $auditPath)) { throw "Missing Anki media: $auditName" }
  $auditHash = (Get-FileHash -LiteralPath $auditPath -Algorithm SHA256).Hash.ToLowerInvariant()
  $auditDownloadPath = Join-Path $auditDownloadDir $auditName
  $auditDownloadMatch = $null
  if (Test-Path -LiteralPath $auditDownloadPath) {
    $auditDownloadMatch = $auditHash -eq (Get-FileHash -LiteralPath $auditDownloadPath -Algorithm SHA256).Hash.ToLowerInvariant()
    if (-not $auditDownloadMatch) { throw "Anki/download bytes differ: $auditName" }
  }
  [pscustomobject]@{filename=$auditName;bytes=(Get-Item -LiteralPath $auditPath).Length;sha256=$auditHash;exists=$true;matchesStagedDownload=$auditDownloadMatch}
}
$auditResults | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath (Join-Path $PSScriptRoot 'anki_media_integrity.json') -Encoding utf8
Write-Output ('Verified Anki media: '+$auditResults.Count+' files; all staged scan-image bytes match.')
