@echo off
setlocal enabledelayedexpansion
title iRacing Telemetry Platform Setup
cd /d "%~dp0"

echo ======================================================================
echo             iRacing Telemetry Platform Initial Setup
echo ======================================================================

echo Checking prerequisites...

where python >nul 2>nul
if errorlevel 1 (
    echo.
    echo [ERROR] Python is not installed or not available in PATH.
    echo.
    echo How to fix:
    echo  1. Download Python 3.11+ from https://www.python.org/downloads/
    echo  2. CRITICAL: Check "Add python.exe to PATH" during installation!
    echo.
    pause
    exit /b 1
)

set "HAS_NPM=1"
where npm >nul 2>nul
if errorlevel 1 (
    set "HAS_NPM=0"
    echo [WARNING] Node.js/npm is not installed. Frontend setup will be skipped.
    echo           Note: This is fine if you only run the Client Agent on a Gaming PC.
)

if not exist ".env" (
    if exist ".env.example" (
        echo Creating .env from .env.example...
        copy ".env.example" ".env" >nul
    ) else (
        echo [WARNING] .env.example not found.
    )
)

if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create Python virtual environment.
        pause
        exit /b 1
    )
)

echo Activating virtual environment...
if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat
) else (
    echo [ERROR] Virtual environment activation script missing.
    pause
    exit /b 1
)

echo Installing Python dependencies...
python -m pip install -e .
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)

if "!HAS_NPM!"=="1" (
    if exist "frontend\package.json" (
        echo Installing frontend dependencies - npm...
        cd frontend
        call npm install
        if errorlevel 1 (
            echo [WARNING] npm install encountered errors. You can retry later in frontend directory.
        )
        cd ..
    )
)

echo.
echo ======================================================================
echo                       SETUP COMPLETED SUCCESSFULLY!
echo ======================================================================
echo.
echo  - For Client / Gaming PC: Run "run.bat"
if "!HAS_NPM!"=="1" (
    echo  - For Local Development:  Run "dev\run_dev.bat"
)
echo.
pause
