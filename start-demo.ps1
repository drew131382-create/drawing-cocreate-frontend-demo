$ErrorActionPreference = 'Stop'

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "Serving demo from: $Root"
Write-Host "Open: http://127.0.0.1:8080"

if (Get-Command python -ErrorAction SilentlyContinue) {
  Set-Location $Root
  python -m http.server 8080
  exit $LASTEXITCODE
}

throw "Python 未找到，无法启动本地静态服务器。"
