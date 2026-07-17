@echo off
echo Starting iRacing Live Telemetry...
call venv\Scripts\activate.bat
python -m scripts.run_live
pause
