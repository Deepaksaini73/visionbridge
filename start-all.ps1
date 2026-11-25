# VisionBridge Local Startup Script (PowerShell)
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "       Starting VisionBridge Suite Locally     " -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan

# Check if port 8001 or 5000 or 5173 have zombie processes
$ports = @(8001, 5000, 5173)
foreach ($p in $ports) {
    $conn = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue
    if ($conn) {
        Write-Host "[Info] Port $p is active (PID: $($conn[0].OwningProcess))." -ForegroundColor Yellow
    }
}

Write-Host "`nLaunching all 3 services simultaneously (SERVER: 5000, CLIENT: 5173, AI: 8001)..." -ForegroundColor Green
npm run dev
