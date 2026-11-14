@echo off
title CALLUNA - Lunar Navigation System
echo ===================================================
echo   CALLUNA - Lunar Mission & Navigation Planner
echo ===================================================
echo.

cd /d "%~dp0backend"

:: 1. Cree un environnement virtuel local s'il n'existe pas encore
if not exist "venv" (
    echo [1/3] Premiere execution : creation de l'environnement Python...
    python -m venv venv
)

:: 2. Active l'environnement et installe les dependances si besoin
call venv\Scripts\activate.bat
echo [2/3] Verification des dependances Python...
pip install -q -r requirements.txt

:: 3. Ouvre le navigateur et demarre le serveur
echo [3/3] Demarrage du serveur CALLUNA sur http://localhost:8000 ...
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:8000"
python -m uvicorn api_mission:app --host 127.0.0.1 --port 8000

pause