start "Backend" cmd /k "venv\Scripts\activate.bat && uvicorn telemetry.api:app --reload"
start "Frontend" cmd /k "cd frontend && npm run dev"
