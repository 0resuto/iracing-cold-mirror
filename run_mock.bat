@echo off
echo Starting iRacing Mock Telemetry...
call venv\Scripts\activate.bat
python -m scripts.run_mock
pause
