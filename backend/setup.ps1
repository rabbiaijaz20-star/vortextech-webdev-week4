# Outpost backend - one-time setup + run. Always operates on THIS folder only.
$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

Write-Host "== Outpost backend setup ==" -ForegroundColor Cyan
Write-Host "Working folder: $PSScriptRoot"

if (-not (Test-Path ".\venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
}

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

Write-Host "Installing dependencies (this can take a minute)..." -ForegroundColor Yellow
pip install -q -r requirements.txt

if (-not (Test-Path ".\.env")) {
    Copy-Item ".env.example" ".env"
}

$envContent = Get-Content ".env" -Raw
if ($envContent -match "GROQ_API_KEY=\s*(your_groq_api_key_here)?\s*(\r?\n|$)") {
    Write-Host ""
    Write-Host "No Groq API key found in .env yet." -ForegroundColor Yellow
    Write-Host "Get a free one at https://console.groq.com/keys (no card needed)."
    $key = Read-Host "Paste your Groq API key now and press Enter"
    if ($key) {
        $envContent = $envContent -replace "GROQ_API_KEY=.*", "GROQ_API_KEY=$key"
        Set-Content ".env" $envContent
        Write-Host "Saved to .env" -ForegroundColor Green
    } else {
        Write-Host "No key entered - the CV tailoring feature will not work until you add one to .env." -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Starting server at http://localhost:8000 (leave this window open)..." -ForegroundColor Cyan
uvicorn main:app --reload --port 8000
