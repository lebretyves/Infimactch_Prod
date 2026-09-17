$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath (Join-Path $PSScriptRoot '../..')
$jobspipeSecret = Read-Host 'Collez la cle JobsPipe (saisie masquee)' -AsSecureString
$jobspipePointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($jobspipeSecret)
try {
  [Runtime.InteropServices.Marshal]::PtrToStringBSTR($jobspipePointer) | node scripts/vault/jobspipe-key.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Enregistrement Vault echoue' }
} finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($jobspipePointer)
  $jobspipeSecret.Dispose()
}
npm run cli:vault -- import-jobspipe --limit 10
