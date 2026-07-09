from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import sessionmaker, joinedload
from telemetry.database import engine, Telemetry, Session, Lap, Player
from pydantic import BaseModel
import redis
import json
from fastapi import Depends
from fastapi.middleware.cors import CORSMiddleware
import asyncio


DBSession = sessionmaker(bind=engine)

redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

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

    class Config:
        from_attributes = True


class LapResponse(BaseModel):
    id: int
    lap_number: int
    lap_time: float
    
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


@app.get("/api/status")
def get_status():
    return {"status": "ok", "message": "API is running"}


@app.get("/api/telemetry/latest", response_model=list[TelemetryResponse])
def get_latest_telemetry(db = Depends(get_db)):
    data_objects = db.query(Telemetry).order_by(Telemetry.id.desc()).limit(10).all()
    return data_objects


@app.get("/api/laps/{lap_id}/telemetry", response_model=list[TelemetryResponse])
def get_lap_telemetry(lap_id: int, db = Depends(get_db)):
    data_objects = db.query(Telemetry).filter(Telemetry.lap_id == lap_id).all()
    return data_objects
    

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
    players = db.query(Player).options(joinedload(Player.sessions).joinedload(Session.laps)).all()
    return players