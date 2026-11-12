$ErrorActionPreference = 'Stop'
$appDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$nodeExecutable = (Get-Command node -ErrorAction Stop).Source
$ffmpegExecutable = (Get-Command ffmpeg -ErrorAction Stop).Source
$logDirectory = Join-Path $appDirectory 'private'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8774/health' -Headers @{Origin='https://normalanatomy-lectures.vercel.app'} -TimeoutSec 2
  if ($health.service -eq 'normalanatomy-timing') { Write-Output 'Automatic timing is already running.'; exit 0 }
} catch { }
$serviceFile = Join-Path $PSScriptRoot 'service.mjs'
$arguments = @('"' + $serviceFile + '"', '--ffmpeg', '"' + $ffmpegExecutable + '"')
Start-Process -FilePath $nodeExecutable -ArgumentList $arguments -WorkingDirectory $appDirectory -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logDirectory 'timing-service.log') -RedirectStandardError (Join-Path $logDirectory 'timing-service-error.log')
Write-Output 'Started the local automatic timing processor.'
