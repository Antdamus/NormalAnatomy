$ErrorActionPreference = 'Stop'
$startupDirectory = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDirectory 'NormalAnatomy Automatic Timing.lnk'
$launcher = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'start.ps1'))
if (Test-Path -LiteralPath $shortcutPath) { throw "Startup shortcut already exists; preserve and inspect it: $shortcutPath" }
$windowsShell = New-Object -ComObject WScript.Shell
$shortcut = $windowsShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $PSHOME 'pwsh.exe'
if (-not (Test-Path -LiteralPath $shortcut.TargetPath)) { $shortcut.TargetPath = Join-Path $PSHOME 'powershell.exe' }
$shortcut.Arguments = '-NoProfile -WindowStyle Hidden -File "' + $launcher + '"'
$shortcut.WorkingDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$shortcut.WindowStyle = 7
$shortcut.Description = 'Local automatic image timing for the private NormalAnatomy lecture library.'
$shortcut.Save()
Write-Output "Installed current-user startup shortcut: $shortcutPath"
