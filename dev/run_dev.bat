@echo off
setlocal enabledelayedexpansion
title iRacing Telemetry Developer Control Panel
cd /d "%~dp0\.."

:MENU
cls
echo ======================================================================
echo             iRacing Telemetry Platform Developer Panel
echo ======================================================================
echo  Root: %CD%
echo ======================================================================
echo.
echo  [1]  Start Full Stack (API + Items [2] and [3])
echo  [2]  Start Frontend Only (Vite Dev Server)
echo  [3]  Start Infrastructure (Postgres + Redis)
echo  [4]  Start IBT Sync Agent (Background Uploader)
echo  [5]  Start Simulator Studio GUI (Engine + Streamer)
echo  [6]  Run Tests (pytest)
echo  [7]  Stop Infrastructure (Docker Down)
echo.
echo  [0]  Exit
echo ======================================================================
set /p CHOICE="Select an option [0-7]: "

if "%CHOICE%"=="1" goto DEV_FULLSTACK
if "%CHOICE%"=="2" goto DEV_FRONTEND
if "%CHOICE%"=="3" goto INFRA_ONLY
if "%CHOICE%"=="4" goto RUN_AGENT
if "%CHOICE%"=="5" goto RUN_SIM_GUI
if "%CHOICE%"=="6" goto RUN_TESTS
if "%CHOICE%"=="7" goto STOP_DOCKER
if "%CHOICE%"=="0" exit /b 0

echo Invalid choice. Please try again.
timeout /t 2 >nul
goto MENU

:DEV_FULLSTACK
cls
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment not found. Run setup.bat first.
    pause
    goto MENU
)

echo Starting Docker infrastructure (Postgres, Redis)...
docker compose up -d postgres redis
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start Docker services. Ensure Docker Desktop is running.
    pause
    goto MENU
)

echo Waiting for PostgreSQL to be ready...
set /a RETRIES=0
:WAIT_PG
powershell -noprofile -command "$c = New-Object System.Net.Sockets.TcpClient; try { $c.Connect('127.0.0.1', 5432); $c.Close(); exit 0 } catch { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 goto PG_READY
set /a RETRIES+=1
if %RETRIES% geq 30 (
    echo [ERROR] PostgreSQL did not become ready in time.
    pause
    goto MENU
)
timeout /t 1 >nul
goto WAIT_PG
:PG_READY
echo PostgreSQL is ready.

echo Running database migrations...
call venv\Scripts\activate.bat
alembic upgrade head
if errorlevel 1 (
    echo.
    echo [ERROR] Database migrations failed.
    pause
    goto MENU)

echo Cleaning up orphaned processes...
powershell -noprofile -command "Get-WmiObject Win32_Process -Filter \"name='python.exe'\" | Where-Object { $_.CommandLine -match 'uvicorn' -or $_.CommandLine -match 'scripts.simulator_gui' } | ForEach-Object { $_.Terminate() }" >nul 2>&1

echo Starting FastAPI Backend...
start /min "FastAPI Backend (Dev)" cmd /k "cd /d %CD% && call venv\Scripts\activate.bat && uvicorn telemetry.api.app:app --reload --host 127.0.0.1 --port 8000"

echo Starting React Frontend (Vite)...
start /min "React Frontend (Vite)" cmd /k "cd /d %CD%\frontend && npm run dev"

echo.
echo ======================================================================
echo Full stack development environment started!
echo  - API Docs:  http://127.0.0.1:8000/docs
echo  - Frontend:  http://127.0.0.1:5173
echo ======================================================================
pause
goto MENU

:DEV_FRONTEND
cls
echo Starting React Frontend Vite Dev Server...
start /min "React Frontend (Vite Dev)" cmd /k "cd /d %CD%\frontend && npm run dev"
echo.
echo ======================================================================
echo Vite Dev Server started: http://localhost:5173
echo ======================================================================
pause
goto MENU

:INFRA_ONLY
cls
echo Starting Docker infrastructure (Postgres, Redis)...
docker compose up -d postgres redis
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start Docker services.
    pause
    goto MENU
)
echo.
echo Infrastructure started (Postgres: 5432, Redis: 6379)
pause
goto MENU

:RUN_AGENT
cls
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment not found. Run setup.bat first.
    pause
    goto MENU
)
echo Cleaning up orphaned IBT agents...
powershell -noprofile -command "Get-WmiObject Win32_Process -Filter \"name='python.exe'\" | Where-Object { $_.CommandLine -match 'scripts.agent' } | ForEach-Object { $_.Terminate() }" >nul 2>&1

echo Starting IBT Sync Agent...
call venv\Scripts\activate.bat
python -m scripts.agent
pause
goto MENU

:RUN_SIM_GUI
cls
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment not found. Run setup.bat first.
    pause
    goto MENU
)
echo Launching Simulator Studio GUI...
start "" "%CD%\venv\Scripts\pythonw.exe" "%CD%\scripts\simulator_gui.py"
goto MENU

:RUN_TESTS
cls
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment not found. Run setup.bat first.
    pause
    goto MENU
)
echo Running pytest...
call venv\Scripts\activate.bat
pytest -v
pause
goto MENU

:STOP_DOCKER
cls
echo Stopping Docker containers...
docker compose down
pause
goto MENU
