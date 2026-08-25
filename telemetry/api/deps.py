import secrets

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from telemetry.config import settings
from telemetry.db import get_db

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(header_key: str | None = Security(api_key_header)) -> None:
    # In dev mode (API_KEY not set), skip authentication for convenience.
    # Set API_KEY in .env to enable protection.
    if not settings.api_key or not settings.api_key.strip():
        return

    if not header_key or not secrets.compare_digest(header_key, settings.api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )


__all__ = ["get_db", "verify_api_key"]
