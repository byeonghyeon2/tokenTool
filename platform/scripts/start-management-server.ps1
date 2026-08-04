$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$LogDir = Join-Path $Root "workspace-data\logs"
$OutLog = Join-Path $LogDir "management-server.out.log"
$ErrLog = Join-Path $LogDir "management-server.err.log"

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

$Existing = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Where-Object { $_.State -eq "Listen" } |
  Select-Object -First 1

if ($Existing) {
  Write-Output "Management tool server already listening on http://127.0.0.1:3000 (PID $($Existing.OwningProcess))"
  exit 0
}

cscript.exe //nologo (Join-Path $PSScriptRoot "start-management-server.vbs") | Out-Null

$Ready = $false
for ($Attempt = 1; $Attempt -le 10; $Attempt++) {
  try {
    $Response = Invoke-WebRequest -Uri "http://127.0.0.1:3000/" -UseBasicParsing -TimeoutSec 5
    if ($Response.StatusCode -ge 200 -and $Response.StatusCode -lt 500) {
      $Ready = $true
      break
    }
  } catch {
    Start-Sleep -Seconds 1
  }
}

if (-not $Ready) {
  Write-Output "--- stdout ---"
  Get-Content -Tail 80 $OutLog -ErrorAction SilentlyContinue
  Write-Output "--- stderr ---"
  Get-Content -Tail 80 $ErrLog -ErrorAction SilentlyContinue
  throw "Management tool server did not start."
}

Write-Output "Management tool server ready: http://127.0.0.1:3000"
