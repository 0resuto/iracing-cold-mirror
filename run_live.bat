@echo off
echo Starting iRacing Live Telemetry...
call venv\Scripts\activate.bat
python -m dev.run_live
pause
