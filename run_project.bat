@echo off
setlocal

cd /d "%~dp0"

echo Checking environment...

where python >nul 2>nul
if errorlevel 1 (
    echo ERROR: Python is not installed or is not available in PATH.
    pause
    exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm is not installed or is not available in PATH.
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        echo .env not found. Creating it from .env.example...
        copy ".env.example" ".env" >nul
    ) else (
        echo WARNING: .env and .env.example were not found.
    )
)

if not exist "venv\Scripts\activate.bat" (
    echo Python virtual environment not found. Creating venv...
    python -m venv venv
    if errorlevel 1 (
        echo ERROR: Failed to create Python virtual environment.
        pause
        exit /b 1
    )
)

call "venv\Scripts\activate.bat"
if errorlevel 1 (
    echo ERROR: Failed to activate Python virtual environment.
    pause
    exit /b 1
)

python -m pip --version >nul 2>nul
if errorlevel 1 (
    echo ERROR: pip is not available in the Python virtual environment.
    pause
    exit /b 1
)

if exist "requirements.txt" (
    echo Installing backend dependencies...
    python -m pip install -r requirements.txt
    if errorlevel 1 (
        echo ERROR: Failed to install backend dependencies.
        pause
        exit /b 1
    )
) else (
    echo WARNING: requirements.txt was not found. Skipping backend dependencies.
)

set "DOCKER_COMPOSE_AVAILABLE=0"
where docker >nul 2>nul
if not errorlevel 1 (
    docker compose version >nul 2>nul
    if not errorlevel 1 (
        set "DOCKER_COMPOSE_AVAILABLE=1"
    )
)

if exist "docker-compose.yml" (
    if "%DOCKER_COMPOSE_AVAILABLE%"=="1" (
        echo Starting database and Redis containers...
        docker compose up -d postgres redis
        if errorlevel 1 (
            echo ERROR: Failed to start Docker services.
            echo Make sure Docker Desktop is running and port 5432 is not used by another PostgreSQL instance.
            pause
            exit /b 1
        )

        call :wait_for_backend_services
        if errorlevel 1 (
            pause
            exit /b 1
        )
    ) else (
        echo WARNING: Docker Compose is not available. Skipping database and Redis startup.
    )
)

echo Checking database schema...
python -c "exec('from sqlalchemy import inspect, text\nfrom telemetry.database import Base, engine\nlegacy_revisions = {\"cf97760bcb70\"}\ncurrent_revision = None\nwith engine.connect() as conn:\n    tables = set(inspect(conn).get_table_names())\n    if \"alembic_version\" in tables:\n        row = conn.execute(text(\"select version_num from alembic_version\")).first()\n        current_revision = row[0] if row else None\nif current_revision in legacy_revisions:\n    print(f\"Found legacy Alembic revision {current_revision}. Repairing schema stamp...\")\n    Base.metadata.create_all(engine)\n    with engine.begin() as conn:\n        conn.execute(text(\"update alembic_version set version_num = :version\"), {\"version\": \"473a33105f2e\"})\nelse:\n    Base.metadata.create_all(engine)')"
if errorlevel 1 (
    echo ERROR: Failed to check or repair database schema.
    pause
    exit /b 1
)

if exist "alembic.ini" (
    echo Applying database migrations...
    alembic upgrade head
    if errorlevel 1 (
        echo ERROR: Failed to apply database migrations.
        pause
        exit /b 1
    )
)

if not exist "frontend\package.json" (
    echo ERROR: frontend\package.json was not found.
    pause
    exit /b 1
)

pushd frontend
if not exist "node_modules" (
    echo Frontend dependencies not found. Installing...
    if exist "package-lock.json" (
        call npm ci
    ) else (
        call npm install
    )
    if errorlevel 1 (
        popd
        echo ERROR: Failed to install frontend dependencies.
        pause
        exit /b 1
    )
) else (
    echo Frontend dependencies found.
)
popd

echo Starting backend and frontend...
start /MIN "Backend" cmd /k "cd /d ""%CD%"" && call venv\Scripts\activate.bat && uvicorn telemetry.api:app --reload"
start /MIN "Frontend" cmd /k "cd /d ""%CD%\frontend"" && npm run dev"

endlocal
exit /b 0

:wait_for_backend_services
echo Waiting for PostgreSQL and Redis...
python -c "exec('import time, psycopg2, redis\nfrom telemetry.config import settings\ndeadline = time.time() + 60\nlast_error = None\nredis_client = redis.Redis(host=settings.redis_host, port=settings.redis_port, db=0)\nwhile time.time() < deadline:\n    try:\n        psycopg2.connect(settings.database_url).close()\n        redis_client.ping()\n        raise SystemExit(0)\n    except Exception as exc:\n        last_error = exc\n        print(\"Waiting for services...\", exc)\n        time.sleep(2)\nprint(\"ERROR: Services are not available:\", last_error)\nraise SystemExit(1)')"
if errorlevel 1 (
    echo ERROR: PostgreSQL or Redis did not become available.
    echo If PostgreSQL says password authentication failed, remove the old Docker volume or update .env to match the existing database password.
    exit /b 1
)
exit /b 0
