$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Set-Location -LiteralPath $projectRoot
$logDirectory = Join-Path $projectRoot 'data/security/maintenance'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$logFile = Join-Path $logDirectory ((Get-Date -Format 'yyyy-MM') + '.log')
$nodeExecutable = (Get-Command node -ErrorAction Stop).Source
$commands = @('process-closure-requests','purge-retention','retire-stale-offers')
$resultCode = 0
foreach ($command in $commands) {
 Add-Content -LiteralPath $logFile -Value ((Get-Date -Format o) + ' START ' + $command)
 $output = & $nodeExecutable --use-system-ca scripts/vault/run.mjs cli $command --apply 2>&1 | Out-String
 $code = $LASTEXITCODE
 Add-Content -LiteralPath $logFile -Value $output
 Add-Content -LiteralPath $logFile -Value ((Get-Date -Format o) + ' END exit=' + $code)
 if ($code -ne 0) { $resultCode = 1 }
}
& $nodeExecutable scripts/security/rotate-backups.mjs --apply 2>&1 | Out-File -LiteralPath $logFile -Append -Encoding utf8
if ($LASTEXITCODE -ne 0) { $resultCode = 1 }
exit $resultCode
