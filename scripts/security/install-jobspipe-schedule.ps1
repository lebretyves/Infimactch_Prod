$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
if ((Get-TimeZone).Id -ne 'Romance Standard Time') { throw 'Configurer le fuseau Windows Paris avant installation.' }
$taskName = 'InfiMatch-JobsPipe-Import'
$scriptPath = Join-Path $PSScriptRoot 'scheduled-jobspipe.ps1'
$action = New-ScheduledTaskAction -Execute "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -Argument ('-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $scriptPath + '"') -WorkingDirectory $projectRoot
$triggers = @('00:00','07:00','09:00','11:00','13:00','15:00','17:00') | ForEach-Object { New-ScheduledTaskTrigger -Daily -At $_ }
$principal = New-ScheduledTaskPrincipal -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit (New-TimeSpan -Minutes 5) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $triggers -Principal $principal -Settings $settings -Description 'JobsPipe: 10 offres, 00h/07h/09h/11h/13h/15h/17h heure Paris. Pas de rattrapage ni retry automatique.' -Force | Select-Object TaskName,State
