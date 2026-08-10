import asyncio
import logging
import secrets

import anyio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from telemetry.config import settings
from telemetry.redis import redis_client

logger = logging.getLogger(__name__)
router = APIRouter()


@router.websocket("/ws/telemetry/live")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()

    try:
        snapshot = await redis_client.get("telemetry:latest")
        if snapshot:
            await websocket.send_text(snapshot)
    except Exception as e:
        logger.warning(f"Could not fetch initial snapshot: {e}")

    pubsub = redis_client.pubsub()
    await pubsub.subscribe("telemetry:stream")

    async def writer():
        async for message in pubsub.listen():
            if message["type"] == "message":
                await websocket.send_text(message["data"])

    async def reader():
        while True:
            await websocket.receive()

    try:
        async with anyio.create_task_group() as tg:
            tg.start_soon(writer)
            tg.start_soon(reader)
    except WebSocketDisconnect:
        logger.info("Client disconnected cleanly")
    except Exception as e:
        logger.debug(f"WebSocket closed with exception: {e}")
    finally:
        try:
            await pubsub.unsubscribe("telemetry:stream")
        except Exception:
            pass
        finally:
            await pubsub.close()


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
            try:
                await redis_client.set("telemetry:latest", data)
                await redis_client.publish("telemetry:stream", data)
            except Exception as e:
                logger.error(f"Error publishing data: {e}")
                await asyncio.sleep(0.5)
    except WebSocketDisconnect:
        logger.info("Publisher disconnected")
    except Exception as e:
        logger.error(f"Publisher error: {e}")
