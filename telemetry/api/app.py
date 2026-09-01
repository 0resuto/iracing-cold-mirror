import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from telemetry.api.routes import ai, auth, history, live, tracks
from telemetry.config import settings

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


description = """
### Welcome to iRacing Telemetry API
Here you will find all methods for interacting with simulator data:
* **Live Telemetry** (WebSocket streaming)
* **Lap History** and player sessions
* **Delta Analysis** and optimal sectors

Enjoy!
"""

tags_metadata = [
    {
        "name": "Laps",
        "description": "Telemetry and delta analysis for specific laps.",
    },
    {
        "name": "Players",
        "description": "Player sessions, best laps, and ideal lap construction.",
    },
    {
        "name": "System",
        "description": "System status and health checks.",
    },
    {
        "name": "Tracks",
        "description": "Track definitions, corner geometries, and road centerlines.",
    },
]


@asynccontextmanager
async def lifespan(app):
    if not settings.api_key or not settings.api_key.strip():
        logger.warning("API_KEY is not set! Upload endpoint is unprotected.")
    yield
    # Graceful shutdown: close Redis connection pools
    from telemetry.redis import redis_client, redis_sync

    await redis_client.aclose()
    redis_sync.close()


app = FastAPI(
    title="iRacing Telemetry API",
    description=description,
    version="0.2.0",
    openapi_tags=tags_metadata,
    swagger_ui_parameters={"syntaxHighlight.theme": "obsidian", "defaultModelsExpandDepth": -1},
    lifespan=lifespan,
)


app.include_router(ai.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(history.router, prefix="/api/v1")
app.include_router(live.router, prefix="/api/v1")
app.include_router(tracks.router, prefix="/api/v1")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal Server Error",
                "details": "An unexpected error occurred",
            }
        },
    )


@app.get("/api/v1/status", tags=["System"])
def get_status():
    return {"status": "ok", "message": "API is running"}
