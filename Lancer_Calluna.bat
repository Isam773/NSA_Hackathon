@echo off
title CALLUNA - Lunar Navigation System
echo Demarrage du serveur CALLUNA...

cd /d "%~dp0backend"

:: Ouvre le navigateur apres 2 secondes le temps que Uvicorn demarre
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"

:: Lance le serveur FastAPI + l'interface React
python -m uvicorn api_mission:app --host 127.0.0.1 --port 8000
pause