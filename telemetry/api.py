from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlalchemy.orm import sessionmaker, selectinload
from telemetry.database import engine, Telemetry, Session, Lap, Player, Sector
from telemetry.config import settings
from pydantic import BaseModel, ConfigDict, Field
import redis
import json
import asyncio
import logging


import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


DBSession = sessionmaker(bind=engine)

redis_client = redis.Redis(host=settings.redis_host, port=settings.redis_port, db=0, decode_responses=True)

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


class TelemetryResponse(BaseModel):
    id: int = Field(..., description="Unique identifier for the telemetry record")
    speed: float = Field(..., description="Speed (km/h)")
    rpm: int = Field(..., description="Engine revolutions per minute")
    gear: int = Field(..., description="Current gear")
    throttle: float = Field(..., description="Throttle pedal input (from 0.0 to 1.0)")
    brake: float = Field(..., description="Brake pedal input (from 0.0 to 1.0)")
    wheel_angle: float = Field(..., description="Steering wheel angle (rad)")
    session_time: float = Field(..., description="Session time")
    lap_dist_pct: float = Field(..., description="Percentage of lap distance completed (from 0.0 to 1.0)")
    lat: float | None = Field(None, description="GPS Latitude")
    lon: float | None = Field(None, description="GPS Longitude")
    lat_accel: float | None = Field(None, description="Lateral acceleration (G)")
    long_accel: float | None = Field(None, description="Longitudinal acceleration (G)")
    yaw_rate: float | None = Field(None, description="Yaw rate (rad/s)")
    velocity_x: float | None = Field(None, description="Longitudinal velocity in the car's coordinate system (m/s)")
    velocity_z: float | None = Field(None, description="Lateral velocity in the car's coordinate system (m/s)")
    slip_angle: float | None = Field(None, description="Slip angle")
    lf_speed: float | None = Field(None, description="Left front wheel speed (m/s)")
    rf_speed: float | None = Field(None, description="Right front wheel speed (m/s)")
    lr_speed: float | None = Field(None, description="Left rear wheel speed (m/s)")
    rr_speed: float | None = Field(None, description="Right rear wheel speed (m/s)")
    abs_active: float | None = Field(None, description="ABS active flag (0.0 or 1.0)")
    tc_active: float | None = Field(None, description="Traction Control active flag (0.0 or 1.0)")
    wheel_lock: float | None = Field(None, description="Wheel lock flag (0.0 or 1.0)")
    
    model_config = ConfigDict(from_attributes=True)


class SectorResponse(BaseModel):
    id: int = Field(..., description="Unique identifier for the sector")
    sector_number: int = Field(..., description="Sector number")
    sector_time: float = Field(..., description="Sector completion time")
    
    model_config = ConfigDict(from_attributes=True)


class IdealSectorResponse(BaseModel):
    sector_number: int = Field(..., description="Sector number")
    best_time: float = Field(..., description="Best sector time")


class IdealLapResponse(BaseModel):
    ideal_lap_time: float = Field(..., description="Ideal lap time (sum of best sectors)")
    sectors: list[IdealSectorResponse] = Field(..., description="List of best sectors")


class DeltaPointResponse(BaseModel):
    lap_dist_pct: float = Field(..., description="Percentage of lap distance completed")
    delta: float = Field(..., description="Time difference (delta) compared to the reference lap")

    model_config = ConfigDict(from_attributes=True)


class LapResponse(BaseModel):
    id: int = Field(..., description="Unique identifier for the lap")
    lap_number: int = Field(..., description="Lap number")
    lap_time: float = Field(..., description="Lap time")
    sectors: list[SectorResponse] = Field([], description="List of sectors for this lap")

    model_config = ConfigDict(from_attributes=True)


class SessionResponse(BaseModel):
    id: int = Field(..., description="Unique identifier for the session")
    track_name: str = Field(..., description="Name of the track")
    laps: list[LapResponse] = Field([], description="List of laps in the session")
    
    model_config = ConfigDict(from_attributes=True)


class PlayerResponse(BaseModel):
    id: int = Field(..., description="Unique identifier for the player")
    name: str = Field(..., description="Name of the player")
    sessions: list[SessionResponse] = Field([], description="List of sessions for the player")

    model_config = ConfigDict(from_attributes=True)


def get_exact_start_time(telemetry):
    if len(telemetry) < 2:
        return telemetry[0].session_time if telemetry else 0.0
        
    p1 = telemetry[0]
    p2 = telemetry[1]
    
    dist_diff = p2.lap_dist_pct - p1.lap_dist_pct
    if dist_diff <= 0:
        return p1.session_time
        
    time_diff = p2.session_time - p1.session_time
    time_per_pct = time_diff / dist_diff
    
    exact_start_time = p1.session_time - (p1.lap_dist_pct * time_per_pct)
    
    return exact_start_time


def calculate_delta(cur_telemetry, ref_telemetry):
    if not cur_telemetry or not ref_telemetry:
        return []
        
    cur_start_time = get_exact_start_time(cur_telemetry)
    ref_start_time = get_exact_start_time(ref_telemetry)
    
    deltas = []
    j = 0
    ref_len = len(ref_telemetry)
    
    for cur in cur_telemetry:
        while j < ref_len - 1 and ref_telemetry[j].lap_dist_pct < cur.lap_dist_pct:
            j += 1
            
        if j > 0 and j < ref_len:
            p1 = ref_telemetry[j-1]
            p2 = ref_telemetry[j]
            dist_diff = p2.lap_dist_pct - p1.lap_dist_pct
            
            if dist_diff > 0:
                ratio = (cur.lap_dist_pct - p1.lap_dist_pct) / dist_diff
                ref_time_abs = p1.session_time + ratio * (p2.session_time - p1.session_time)
            else:
                ref_time_abs = p2.session_time
                
            cur_elapsed = cur.session_time - cur_start_time
            ref_elapsed = ref_time_abs - ref_start_time
            
            deltas.append({
                "lap_dist_pct": cur.lap_dist_pct, 
                "delta": cur_elapsed - ref_elapsed
            })
    return deltas


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