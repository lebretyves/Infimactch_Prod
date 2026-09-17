$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if ((Get-TimeZone).Id -ne 'Romance Standard Time') { throw 'Configurer le fuseau Windows Paris avant installation.' }
$scriptPath = Join-Path $PSScriptRoot 'scheduled-maintenance.ps1'
$action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $scriptPath + '"') -WorkingDirectory $projectRoot
$trigger = New-ScheduledTaskTrigger -Daily -At '02:30'
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 20) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'InfiMatch-Daily-Maintenance' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description '02:30 Paris : clotures approuvees, retention, fraicheur offres et rotation sauvegardes. Aucun appel fournisseur.' -Force | Select-Object TaskName,State
