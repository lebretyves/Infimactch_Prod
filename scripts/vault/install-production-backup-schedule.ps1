param(
 [Parameter(Mandatory=$true)][string]$BackupDirectory,
 [Parameter(Mandatory=$true)][string]$VaultDirectory
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$backupTarget = [IO.Path]::GetFullPath($BackupDirectory)
$vaultTarget = (Resolve-Path -LiteralPath $VaultDirectory).Path
if ((Get-TimeZone).Id -ne 'Romance Standard Time') { throw 'Configurer le fuseau Windows Paris avant installation.' }
if (-not (Test-Path -LiteralPath (Join-Path $vaultTarget 'operator.json') -PathType Leaf)) { throw 'Identifiants operateur Vault absents.' }
$scriptPath = Join-Path $PSScriptRoot 'scheduled-production-backup.ps1'
$arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $scriptPath + '" -BackupDirectory "' + $backupTarget + '" -VaultDirectory "' + $vaultTarget + '"'
$action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Argument $arguments -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At '02:00'
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 30) -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'InfiMatch-Production-Backup' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Sauvegarde chiffree Supabase/MongoDB 02:00 Paris ; purge locale 30 jours ; necessite session ouverte, Docker et Vault.' -Force | Select-Object TaskName,State
