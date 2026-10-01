# Outpost frontend - one-time setup + run. Always operates on THIS folder only.
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "== Outpost frontend setup ==" -ForegroundColor Cyan
Write-Host "Working folder: $PSScriptRoot"

if (-not (Test-Path ".\node_modules")) {
    Write-Host "Installing dependencies (this can take a minute)..." -ForegroundColor Yellow
    npm install
}

if (-not (Test-Path ".\.env")) {
    Copy-Item ".env.example" ".env"
}

Write-Host ""
Write-Host "Starting dev server (leave this window open)..." -ForegroundColor Cyan
Write-Host "Once it starts, open the URL it prints (usually http://localhost:5173)"
npm run dev
