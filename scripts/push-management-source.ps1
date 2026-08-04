$ErrorActionPreference = "Stop"

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot
$RepositoryUrl = "https://github.com/byeonghyeon2/tokenTool.git"
$EnvPath = Join-Path $WorkspaceRoot ".env"

function Read-GitHubToken {
  if ($env:GITHUB_TOKEN) {
    return $env:GITHUB_TOKEN.Trim()
  }

  if (-not (Test-Path $EnvPath)) {
    throw "GITHUB_TOKEN이 없습니다. 루트 .env 파일을 확인하세요."
  }

  $TokenLine = Get-Content -LiteralPath $EnvPath |
    Where-Object { $_ -match '^GITHUB_TOKEN=' } |
    Select-Object -First 1

  if (-not $TokenLine) {
    throw "루트 .env 파일에 GITHUB_TOKEN 항목이 없습니다."
  }

  return ($TokenLine -replace '^GITHUB_TOKEN=', '').Trim().Trim('"').Trim("'")
}

function Invoke-Git {
  param(
    [Parameter(Mandatory = $true)]
    [string[]] $Arguments
  )

  & git @Arguments

  if ($LASTEXITCODE -ne 0) {
    throw "git 명령 실행 실패: exit code $LASTEXITCODE"
  }
}

$Token = Read-GitHubToken
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
$env:ALL_PROXY = ""
$env:http_proxy = ""
$env:https_proxy = ""
$env:all_proxy = ""

Set-Location $WorkspaceRoot

Invoke-Git @("config", "http.sslBackend", "openssl")

$Remote = (& git remote get-url origin 2>$null)
if ($LASTEXITCODE -ne 0 -or -not $Remote) {
  Invoke-Git @("remote", "add", "origin", $RepositoryUrl)
}

$Branch = (& git branch --show-current).Trim()
if (-not $Branch) {
  $Branch = "main"
}

$Status = (& git status --short)
if ($Status) {
  Invoke-Git @("add", ".")
  Invoke-Git @("commit", "-m", "Update management tool source")
}

$AuthHeader = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("x-access-token:$Token"))
Invoke-Git @("-c", "http.https://github.com/.extraheader=AUTHORIZATION: basic $AuthHeader", "push", "-u", "origin", $Branch)

Write-Output "관리툴 소스 push 완료: $RepositoryUrl ($Branch)"
