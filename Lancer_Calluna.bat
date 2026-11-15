
@echo off
title CALLUNA - Lunar Navigation System
cd /d "%~dp0backend"

echo ===========================================
echo       CALLUNA - Lunar Navigation
echo ===========================================
echo.

:: Create Python environment only on first launch
if not exist "venv\Scripts\python.exe" (
    echo [1/3] Creating Python environment...
    python -m venv venv
    if errorlevel 1 goto error
)

:: Install dependencies only once
if not exist "venv\.calluna-installed" (
    echo [2/3] Installing dependencies...
    venv\Scripts\python.exe -m pip install -r requirements.txt
    if errorlevel 1 goto error

    type nul > "venv\.calluna-installed"
) else (
    echo [2/3] Dependencies already installed.
)

:: Wait for the server to respond before opening browser
echo [3/3] Starting CALLUNA...

start "" powershell -NoProfile -WindowStyle Hidden -Command "$url='http://127.0.0.1:8000/'; for($i=0;$i -lt 60;$i++){try{$r=Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){Start-Process $url; exit}}catch{}; Start-Sleep -Milliseconds 500}"

venv\Scripts\python.exe -m uvicorn api_mission:app --host 127.0.0.1 --port 8000

pause
exit /b

:error
echo.
echo CALLUNA setup failed.
pause
