@echo off
setlocal enabledelayedexpansion
for /F %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"
title iRacing Telemetry Client Control Panel
cd /d "%~dp0"

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_IBT=%STARTUP_DIR%\iracing_ibt_sync_silent.vbs"
set "VBS_LIVE=%STARTUP_DIR%\iracing_live_telemetry_silent.vbs"

:MENU
cls
echo ======================================================================
echo                  iRacing Telemetry Client Control Panel
echo ======================================================================

if exist "venv\Scripts\activate.bat" (
    call venv\Scripts\activate.bat >nul 2>&1
)

python -c "from telemetry.config import settings; print(f'  Target Server:    {settings.server_url}\n  Telemetry Dir:    {settings.iracing_telemetry_dir}')" 2>nul
if errorlevel 1 (
    echo   Target Server:    Unknown - Run setup.bat first
    echo   Telemetry Dir:    Unknown
)

echo.
echo   Process Status (Memory):
powershell -noprofile -command "if (Get-WmiObject Win32_Process -Filter \"name='python.exe'\" | Where-Object { $_.CommandLine -match 'scripts.agent' }) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    echo     - IBT Sync Agent:   %ESC%[32m[ RUNNING ]%ESC%[0m
) else (
    echo     - IBT Sync Agent:   %ESC%[31m[ STOPPED ]%ESC%[0m
)

powershell -noprofile -command "if (Get-WmiObject Win32_Process -Filter \"name='python.exe'\" | Where-Object { $_.CommandLine -match 'scripts.run_live' }) { exit 0 } else { exit 1 }" >nul 2>&1
if %errorlevel% equ 0 (
    echo     - Live Telemetry:   %ESC%[32m[ RUNNING ]%ESC%[0m
) else (
    echo     - Live Telemetry:   %ESC%[31m[ STOPPED ]%ESC%[0m
)
echo ======================================================================
echo.
echo  [1]  Run IBT File Sync Agent           (Console window)
echo  [2]  Run Live Telemetry Streamer       (Console window)
echo  [3]  Run ALL Client Agents             (IBT Sync + Live Streamer)
echo.
echo  --------------------- WINDOWS AUTOSTART (SILENT) ---------------------
echo  [4]  Enable Autostart: IBT Sync Agent Only
echo  [5]  Enable Autostart: Live Streamer Only
echo  [6]  Enable Autostart: ALL Client Agents
echo  [7]  Disable ALL Autostart Tasks
echo.
echo  ---------------------- DIAGNOSTICS AND SETTINGS ----------------------
echo  [8]  Test Server Connection (API Health Check)
echo  [9]  Edit Configuration (.env)
echo.
echo  [0]  Exit
echo ======================================================================
set /p CHOICE="Select an option [0-9]: "

if "%CHOICE%"=="1" goto RUN_IBT
if "%CHOICE%"=="2" goto RUN_LIVE
if "%CHOICE%"=="3" goto RUN_ALL
if "%CHOICE%"=="4" goto ENABLE_IBT
if "%CHOICE%"=="5" goto ENABLE_LIVE
if "%CHOICE%"=="6" goto ENABLE_ALL
if "%CHOICE%"=="7" goto DISABLE_ALL
if "%CHOICE%"=="8" goto TEST_PING
if "%CHOICE%"=="9" goto EDIT_ENV
if "%CHOICE%"=="0" exit

echo Invalid choice. Please try again.
timeout /t 2 >nul
goto MENU

:RUN_IBT
cls
echo Cleaning up orphaned IBT agents...
powershell -noprofile -command "Get-WmiObject Win32_Process -Filter \"name='python.exe'\" | Where-Object { $_.CommandLine -match 'scripts.agent' } | ForEach-Object { $_.Terminate() }" >nul 2>&1
echo Starting IBT File Sync Agent...
python -m scripts.agent
pause
goto MENU

:RUN_LIVE
cls
echo Cleaning up orphaned Live Telemetry agents...
powershell -noprofile -command "Get-WmiObject Win32_Process -Filter \"name='python.exe'\" | Where-Object { $_.CommandLine -match 'scripts.run_live' } | ForEach-Object { $_.Terminate() }" >nul 2>&1
echo Starting Live Telemetry Streamer...
python -m scripts.run_live
pause
goto MENU

:RUN_ALL
cls
echo Cleaning up any orphaned agent processes...
powershell -noprofile -command "Get-WmiObject Win32_Process -Filter \"name='python.exe'\" | Where-Object { $_.CommandLine -match 'scripts.agent' -or $_.CommandLine -match 'scripts.run_live' } | ForEach-Object { $_.Terminate() }" >nul 2>&1

echo Starting both agents in separate console windows...
start "IBT File Sync Agent" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && python -m scripts.agent"
start "Live Telemetry Streamer" cmd /k "cd /d %~dp0 && call venv\Scripts\activate.bat && python -m scripts.run_live"
echo Both agents launched!
timeout /t 3 >nul
goto MENU

:ENABLE_IBT
cls
echo Creating silent startup script for IBT Sync Agent...
(
    echo Set WinScriptHost = CreateObject("WScript.Shell"^)
    echo WinScriptHost.Run "cmd /c cd /d ""%~dp0"" ^&^& call venv\Scripts\activate.bat ^&^& python -m scripts.agent", 0, False
) > "%VBS_IBT%" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Could not write to Startup folder! Try running as Administrator.
) else (
    echo Autostart enabled for IBT Sync Agent!
    echo Starting it now in the background...
    wscript "%VBS_IBT%"
)
timeout /t 2 >nul
goto MENU

:ENABLE_LIVE
cls
echo Creating silent startup script for Live Telemetry Streamer...
(
    echo Set WinScriptHost = CreateObject("WScript.Shell"^)
    echo WinScriptHost.Run "cmd /c cd /d ""%~dp0"" ^&^& call venv\Scripts\activate.bat ^&^& python -m scripts.run_live", 0, False
) > "%VBS_LIVE%" 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Could not write to Startup folder! Try running as Administrator.
) else (
    echo Autostart enabled for Live Telemetry Streamer!
    echo Starting it now in the background...
    wscript "%VBS_LIVE%"
)
timeout /t 2 >nul
goto MENU

:ENABLE_ALL
cls
call :ENABLE_IBT
call :ENABLE_LIVE
goto MENU

:DISABLE_ALL
cls
echo Removing autostart tasks...
echo Stopping any running background agents...
powershell -noprofile -command "Get-WmiObject Win32_Process -Filter \"name='python.exe'\" | Where-Object { $_.CommandLine -match 'scripts.agent' -or $_.CommandLine -match 'scripts.run_live' } | ForEach-Object { $_.Terminate() }" >nul 2>&1
if exist "%VBS_IBT%" del "%VBS_IBT%"
if exist "%VBS_LIVE%" del "%VBS_LIVE%"
if exist "%STARTUP_DIR%\iracing_*.vbs" del "%STARTUP_DIR%\iracing_*.vbs"
echo Autostart disabled for all agents!
timeout /t 2 >nul
goto MENU

:TEST_PING
cls
echo Testing connection to target server...
python -c "import urllib.request, json; from telemetry.config import settings; url=f'{settings.server_url}/api/status'; res=urllib.request.urlopen(url, timeout=5); print('SUCCESS:', json.loads(res.read().decode()))" 2>nul
if errorlevel 1 (
    echo [ERROR] Could not connect to target server! Check SERVER_URL in .env or verify server is running.
)
echo.
pause
goto MENU

:EDIT_ENV
cls
if exist ".env" (
    notepad .env
) else if exist ".env.example" (
    copy ".env.example" ".env"
    notepad .env
) else (
    echo .env file not found. Run setup.bat first.
)
goto MENU
