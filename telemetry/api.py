from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import sessionmaker, selectinload
from telemetry.db import engine
from telemetry.db.models import Telemetry, Session, Lap, Player, Sector
from telemetry.config import settings
from telemetry.services.delta import calculate_delta
from telemetry.redis import redis_client
from telemetry.api.schemas import (
    TelemetryResponse, SectorResponse, IdealSectorResponse, 
    IdealLapResponse, DeltaPointResponse, LapResponse, 
    SessionResponse, PlayerResponse
)
import json
import asyncio
import logging


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


DBSession = sessionmaker(bind=engine)


def get_db():
    db = DBSession()
    try:
        yield db
    finally:
        db.close()


app = FastAPI(
    title="iRacing Telemetry API",
    description="Live telemetry streaming and history storage for iRacing."
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global exception at {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": 500,
                "message": "Internal Server Error",
                "details": str(exc)
            }
        }
    )


@app.get("/api/status")
def get_status():
    return {"status": "ok", "message": "API is running"}


@app.get("/api/telemetry/latest", response_model=list[TelemetryResponse], tags=["live telemetry"], summary="Get latest 10 points of telemetry")
def get_latest_telemetry(db = Depends(get_db)):
    data_objects = db.query(Telemetry).order_by(Telemetry.id.desc()).limit(10).all()
    return data_objects


@app.get("/api/laps/{lap_id}/telemetry", response_model=list[TelemetryResponse], tags=["telemetry"], summary="Get lap telemetry")
def get_lap_telemetry(lap_id: int, db = Depends(get_db)):
    data_objects = db.query(Telemetry).filter(Telemetry.lap_id == lap_id).order_by(Telemetry.session_time.asc()).all()
    return data_objects


@app.get("/api/players/{player_id}/best_lap", response_model=LapResponse, tags=["best lap"], summary="Get best lap")
def get_best_lap(player_id: int, track_name: str, db = Depends(get_db)):
    best_lap = db.query(Lap).join(Session).filter(
        Session.player_id == player_id,
        Session.track_name == track_name,
        Lap.lap_time > 0
    ).order_by(Lap.lap_time.asc()).first()
    
    if not best_lap:
        raise HTTPException(status_code=404, detail="Best lap not found")
        
    return best_lap


@app.get("/api/players/{player_id}/ideal_lap", response_model=IdealLapResponse, tags=["ideal lap"], summary="Get ideal lap")
def get_ideal_lap(player_id: int, track_name: str, db = Depends(get_db)):
    best_sectors = db.query(
        Sector.sector_number, 
        func.min(Sector.sector_time).label('best_time')
    ).join(Lap).join(Session).filter(
        Session.player_id == player_id,
        Session.track_name == track_name,
        Sector.sector_time > 0
    ).group_by(Sector.sector_number).order_by(Sector.sector_number.asc()).all()
    
    if not best_sectors:
        raise HTTPException(status_code=404, detail="No sectors found for this track")
        
    ideal_time = sum(row.best_time for row in best_sectors)
    
    sectors_list = [
        {"sector_number": row.sector_number, "best_time": row.best_time} 
        for row in best_sectors
    ]
    
    return {"ideal_lap_time": ideal_time, "sectors": sectors_list}


@app.get("/api/laps/{lap_id}/delta", response_model=list[DeltaPointResponse], tags=["delta"], summary="Get delta between two laps")
def get_lap_delta(lap_id: int, reference_lap_id: int, db = Depends(get_db)):
    cur_data = db.query(Telemetry.lap_dist_pct, Telemetry.session_time).filter(Telemetry.lap_id == lap_id).order_by(Telemetry.session_time.asc()).all()
    ref_data = db.query(Telemetry.lap_dist_pct, Telemetry.session_time).filter(Telemetry.lap_id == reference_lap_id).order_by(Telemetry.session_time.asc()).all()
    
    if not cur_data or not ref_data:
        raise HTTPException(status_code=404, detail="Telemetry not found for one or both laps")
        
    deltas = calculate_delta(cur_data, ref_data)
    
    return deltas


@app.websocket("/ws/telemetry/live")
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


@app.get("/api/history", response_model=list[PlayerResponse], tags=["history"], summary="Get all players history")
def get_history(skip: int = 0, limit: int = 10, db = Depends(get_db)):
    players = db.query(Player).options(
        selectinload(Player.sessions).
        selectinload(Session.laps).
        selectinload(Lap.sectors)
    ).offset(skip).limit(limit).all()
    return players