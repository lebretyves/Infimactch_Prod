$ErrorActionPreference = 'Continue'
$projectRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
Set-Location -LiteralPath $projectRoot
$logDirectory = Join-Path $projectRoot 'data/security/france-travail'
New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
$logFile = Join-Path $logDirectory ((Get-Date -Format 'yyyy-MM') + '.log')
function Write-Log([string]$message) {
  Add-Content -LiteralPath $logFile -Value ((Get-Date -Format o) + ' ' + $message)
}
Write-Log 'START France Travail import limit=10 per keyword; 4 searches'
$resultCode = 1
try {
  $output = & 'C:\Program Files\nodejs\node.exe' scripts/vault/run.mjs cli import-offers --limit 10 2>&1 | Out-String
  if ($null -ne $LASTEXITCODE) { $resultCode = $LASTEXITCODE }
  if ($output) { Add-Content -LiteralPath $logFile -Value $output.TrimEnd() }
  if ($resultCode -ne 0 -and -not $output) { Write-Log 'ERROR no process output; check Vault, Node and PostgreSQL' }
} catch {
  Write-Log ('ERROR ' + $_.Exception.Message)
  $resultCode = 1
}
Write-Log ('END exit=' + $resultCode)
exit $resultCode
