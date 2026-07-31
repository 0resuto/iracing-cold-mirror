import secrets

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from telemetry.config import settings
from telemetry.db import get_db

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(header_key: str | None = Security(api_key_header)) -> None:
    if not settings.api_key or not settings.api_key.strip():
        import logging

        logging.getLogger(__name__).warning(
            "API_KEY is not set! API is unprotected. Set API_KEY in .env for production."
        )
        return
        # raise HTTPException(status_code=500, detail="Server misconfigured: API_KEY not set")

    if not header_key or not secrets.compare_digest(header_key, settings.api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API Key",
        )


__all__ = ["get_db", "verify_api_key"]
