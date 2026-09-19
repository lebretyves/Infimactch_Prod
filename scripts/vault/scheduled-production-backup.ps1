param(
 [Parameter(Mandatory=$true)][string]$BackupDirectory,
 [Parameter(Mandatory=$true)][string]$VaultDirectory
)
$ErrorActionPreference = 'Stop'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$env:INFIMATCH_BACKUP_DIRECTORY = [IO.Path]::GetFullPath($BackupDirectory)
$env:INFIMATCH_VAULT_PRIVATE_DIR = [IO.Path]::GetFullPath($VaultDirectory)
$env:NODE_USE_SYSTEM_CA = '1'
$nodeExecutable = (Get-Command node -ErrorAction Stop).Source
$logDirectory = Join-Path $projectRoot 'data/security/production-backups'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$logFile = Join-Path $logDirectory ((Get-Date -Format 'yyyy-MM') + '.log')
Set-Location -LiteralPath $projectRoot
# Rotation first: an unavailable provider never extends local retention.
foreach ($operation in @('rotate-production-backups.mjs','backup-production.mjs')) {
 $scriptFile = Join-Path $PSScriptRoot $operation
 Add-Content -LiteralPath $logFile -Value ((Get-Date -Format o) + ' START ' + $operation)
 if ($operation -eq 'rotate-production-backups.mjs') { $output = & $nodeExecutable $scriptFile --apply 2>&1 | Out-String }
 else { $output = & $nodeExecutable $scriptFile 2>&1 | Out-String }
 $resultCode = $LASTEXITCODE
 Add-Content -LiteralPath $logFile -Value $output
 Add-Content -LiteralPath $logFile -Value ((Get-Date -Format o) + ' END exit=' + $resultCode)
 if ($resultCode -ne 0) { exit $resultCode }
}
exit 0
