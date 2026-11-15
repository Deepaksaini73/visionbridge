@echo off
echo =======================================================
echo  Starting VisionBridge AI Service (Port 8001)
echo =======================================================
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Virtual environment not found at .venv!
    echo Please run: python -m venv .venv
    pause
    exit /b 1
)
.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8001 --reload
pause
