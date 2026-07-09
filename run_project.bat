start /MIN "Backend" cmd /k "venv\Scripts\activate.bat && uvicorn telemetry.api:app --reload"
start /MIN "Frontend" cmd /k "cd frontend && npm run dev"
