#!/bin/bash
set -e

echo "Running database migrations..."
alembic upgrade head

echo "Starting API server..."
exec uvicorn telemetry.api.app:app --host 0.0.0.0 --port 8000
