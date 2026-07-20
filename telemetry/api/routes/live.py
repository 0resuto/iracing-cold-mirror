from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from telemetry.redis import redis_client
import json
import asyncio
import logging


logger = logging.getLogger(__name__)
router = APIRouter()

@router.websocket("/ws/telemetry/live")
async def websocket_telemetry(websocket: WebSocket):
    await websocket.accept()

    try:
        while True:
            raw_data = redis_client.get("telemetry:latest")
            
            if raw_data:
                await websocket.send_text(raw_data)
            else:
                await websocket.send_text(json.dumps({"status": "waiting for data"}))

            await asyncio.sleep(0.5)

    except WebSocketDisconnect:
        logger.info("Client disconnected")