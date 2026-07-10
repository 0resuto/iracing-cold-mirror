@echo off
echo Starting iRacing Mock Telemetry...
call venv\Scripts\activate.bat
python -m dev.run_mock
pause
