@echo off
setlocal enabledelayedexpansion
title iRacing Telemetry Platform Developer Control Panel
cd /d "%~dp0\.."

:MENU
cls
echo ======================================================================
echo             iRacing Telemetry Platform Developer Panel
echo ======================================================================
echo  Root Directory: %CD%
echo ======================================================================
echo.
echo  ---------------------- LOCAL DEVELOPMENT -----------------------
echo  [1]  Start Full Stack Dev Mode (Postgres + Redis + API + Frontend)
echo  [2]  Start Docker Infrastructure Only (Postgres + Redis + pgAdmin)
echo.
echo  ----------------------- TESTING AND MOCKING ------------------------
echo  [3]  Run Test Suite (pytest)
echo  [4]  Run Telemetry Mock Generator (scripts.run_mock)
echo  [5]  Run Database Migrations (alembic upgrade head)
echo.
echo  ------------------------- UTILITIES -----------------------------
echo  [6]  Stop Docker Containers
echo  [7]  Edit Configuration (.env)
echo.
echo  [0]  Exit
echo ======================================================================
set /p CHOICE="Select an option [0-7]: "

if "%CHOICE%"=="1" goto DEV_FULLSTACK
if "%CHOICE%"=="2" goto INFRA_ONLY
if "%CHOICE%"=="3" goto RUN_TESTS
if "%CHOICE%"=="4" goto RUN_MOCK
if "%CHOICE%"=="5" goto RUN_MIGRATIONS
if "%CHOICE%"=="6" goto STOP_DOCKER
if "%CHOICE%"=="7" goto EDIT_ENV
if "%CHOICE%"=="0" exit /b 0

echo Invalid choice. Please try again.
timeout /t 2 >nul
goto MENU

:DEV_FULLSTACK
cls
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment not found. Please run setup.bat first.
    echo.
    pause
    goto MENU
)

echo Starting Docker infrastructure (Postgres, Redis)...
docker compose up -d postgres redis
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start Docker services. Make sure Docker Desktop is running.
    echo.
    pause
    goto MENU
)

echo Activating Python venv and running database migrations...
call venv\Scripts\activate.bat
alembic upgrade head

echo Starting FastAPI Backend in separate window...
start "FastAPI Backend (Dev)" cmd /k "cd /d %CD% && call venv\Scripts\activate.bat && uvicorn telemetry.api.app:app --reload --host 127.0.0.1 --port 8000"

echo Starting React Frontend (Vite) in separate window...
start "React Frontend (Vite)" cmd /k "cd /d %CD%\frontend && npm run dev"

echo Starting Telemetry Sync Agent in separate window...
start "IBT Sync Agent" cmd /k "cd /d %CD% && call venv\Scripts\activate.bat && python -m scripts.agent"

echo.
echo ======================================================================
echo Full stack development environment launched!
echo  - API Docs:   http://127.0.0.1:8000/docs
echo  - Frontend:   http://127.0.0.1:5173
echo ======================================================================
pause
goto MENU

:INFRA_ONLY
cls
echo Starting Docker infrastructure (Postgres, Redis, pgAdmin)...
docker compose up -d postgres redis pgadmin
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start Docker services. Make sure Docker Desktop is running.
    echo.
    pause
    goto MENU
)
echo.
echo Infrastructure started!
echo  - Postgres: localhost:5432
echo  - Redis:    localhost:6379
echo  - pgAdmin:  http://localhost:5050 (admin@admin.com / admin)
pause
goto MENU

:RUN_TESTS
cls
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment not found. Please run setup.bat first.
    pause
    goto MENU
)
echo Running pytest test suite...
call venv\Scripts\activate.bat
pytest -v
pause
goto MENU

:RUN_MOCK
cls
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment not found. Please run setup.bat first.
    pause
    goto MENU
)
echo Running Telemetry Mock Generator...
call venv\Scripts\activate.bat
python -m scripts.run_mock
pause
goto MENU

:RUN_MIGRATIONS
cls
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Python virtual environment not found. Please run setup.bat first.
    pause
    goto MENU
)
echo Running Alembic database migrations...
call venv\Scripts\activate.bat
alembic upgrade head
pause
goto MENU

:STOP_DOCKER
cls
echo Stopping Docker containers...
docker compose down
pause
goto MENU

:EDIT_ENV
cls
if exist ".env" (
    notepad .env
) else (
    echo .env file not found. Run setup.bat first.
)
goto MENU
