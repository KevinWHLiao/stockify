$portable = Join-Path $env:LOCALAPPDATA "nodejs-portable\node-v24.18.1-win-x64"
if (-not (Get-Command node -ErrorAction SilentlyContinue) -and (Test-Path $portable)) {
  $env:PATH = "$portable;" + $env:PATH
}
Set-Location $PSScriptRoot
npm run web
