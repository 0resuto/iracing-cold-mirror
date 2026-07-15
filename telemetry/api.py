from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import sessionmaker, joinedload
from telemetry.database import engine, Telemetry, Session, Lap, Player, Sector
from pydantic import BaseModel
import redis
import json
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from telemetry.config import settings


DBSession = sessionmaker(bind=engine)

redis_client = redis.Redis(host=settings.redis_host, port=settings.redis_port, db=0, decode_responses=True)

def get_db():
    db = DBSession()
    try:
        yield db
    finally:
        db.close()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TelemetryResponse(BaseModel):
    id: int
    speed: float
    rpm: int
    gear: int
    throttle: float
    brake: float
    wheel_angle: float
    session_time: float
    lap_dist_pct: float
    lat: float | None = None
    lon: float | None = None
    lat_accel: float | None = None
    long_accel: float | None = None
    yaw_rate: float | None = None
    velocity_x: float | None = None
    velocity_z: float | None = None
    slip_angle: float | None = None
    lf_speed: float | None = None
    rf_speed: float | None = None
    lr_speed: float | None = None
    rr_speed: float | None = None
    abs_active: float | None = None
    tc_active: float | None = None
    wheel_lock: float | None = None
    
    class Config:
        from_attributes = True


class SectorResponse(BaseModel):
    id: int
    sector_number: int
    sector_time: float
    
    class Config:
        from_attributes = True


class IdealSectorResponse(BaseModel):
    sector_number: int
    best_time: float


class IdealLapResponse(BaseModel):
    ideal_lap_time: float
    sectors: list[IdealSectorResponse]


class DeltaPointResponse(BaseModel):
    lap_dist_pct: float
    delta: float

    class Config:
        from_attributes = True


class LapResponse(BaseModel):
    id: int
    lap_number: int
    lap_time: float
    sectors: list[SectorResponse] = []

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    id: int
    track_name: str
    laps: list[LapResponse] = []
    
    class Config:
        from_attributes = True


class PlayerResponse(BaseModel):
    id: int
    name: str
    sessions: list[SessionResponse] = []

    class Config:
        from_attributes = True


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


@app.get("/api/status")
def get_status():
    return {"status": "ok", "message": "API is running"}


@app.get("/api/telemetry/latest", response_model=list[TelemetryResponse])
def get_latest_telemetry(db = Depends(get_db)):
    data_objects = db.query(Telemetry).order_by(Telemetry.id.desc()).limit(10).all()
    return data_objects


@app.get("/api/laps/{lap_id}/telemetry", response_model=list[TelemetryResponse])
def get_lap_telemetry(lap_id: int, db = Depends(get_db)):
    data_objects = db.query(Telemetry).filter(Telemetry.lap_id == lap_id).order_by(Telemetry.session_time.asc()).all()
    return data_objects


@app.get("/api/players/{player_id}/best_lap", response_model=LapResponse)
def get_best_lap(player_id: int, track_name: str, db = Depends(get_db)):
    best_lap = db.query(Lap).join(Session).filter(
        Session.player_id == player_id,
        Session.track_name == track_name,
        Lap.lap_time > 0
    ).order_by(Lap.lap_time.asc()).first()
    
    if not best_lap:
        raise HTTPException(status_code=404, detail="Best lap not found")
        
    return best_lap


@app.get("/api/players/{player_id}/ideal_lap", response_model=IdealLapResponse)
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


@app.get("/api/laps/{lap_id}/delta", response_model=list[DeltaPointResponse])
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
        print("Client disconnected")


@app.get("/api/history", response_model=list[PlayerResponse])
def get_history(db = Depends(get_db)):
    players = db.query(Player).options(joinedload(Player.sessions).joinedload(Session.laps).joinedload(Lap.sectors)).all()
    return players