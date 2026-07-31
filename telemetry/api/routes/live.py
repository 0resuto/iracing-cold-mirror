import asyncio
import json
import logging
import secrets

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from telemetry.config import settings
from telemetry.redis import redis_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/telemetry/live")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            raw_data = await redis_client.get("telemetry:latest")
            if raw_data:
                await websocket.send_text(raw_data)
            else:
                await websocket.send_text(json.dumps({"status": "waiting for data"}))
            await asyncio.sleep(0.016)
    except WebSocketDisconnect:
        logger.info("Client disconnected")


@router.websocket("/ws/telemetry/publish")
async def websocket_publish_telemetry(websocket: WebSocket):
    if settings.api_key and settings.api_key.strip():
        token = websocket.query_params.get("token")
        if not token or not secrets.compare_digest(token, settings.api_key):
            await websocket.close(code=4003, reason="Forbidden")
            return
    await websocket.accept()
    logger.info("Publisher connected")
    try:
        while True:
            data = await websocket.receive_text()
            await redis_client.set("telemetry:latest", data)
    except WebSocketDisconnect:
        logger.info("Publisher disconnected")
