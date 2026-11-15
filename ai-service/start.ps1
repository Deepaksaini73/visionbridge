# Launch VisionBridge Python AI Service
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " Starting VisionBridge AI & Computer Vision Service" -ForegroundColor Cyan
Write-Host " Host: http://127.0.0.1:8001 | Docs: http://127.0.0.1:8001/docs" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

if (-not (Test-Path ".venv\Scripts\python.exe")) {
    Write-Host "[ERROR] Virtual environment not found in .venv!" -ForegroundColor Red
    Write-Host "Please create it using: python -m venv .venv" -ForegroundColor Yellow
    exit 1
}

& .\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8001 --reload
