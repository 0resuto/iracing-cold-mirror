from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from telemetry.api.deps import get_db
from telemetry.db.models import Telemetry, Session, Lap, Sector, Player
from telemetry.services.delta import calculate_delta
from telemetry.api.schemas import (
    TelemetryResponse, SectorResponse, IdealSectorResponse, 
    IdealLapResponse, DeltaPointResponse, LapResponse, 
    SessionResponse, PlayerResponse
)
router = APIRouter()

@router.get("/laps/{lap_id}/telemetry", response_model=list[TelemetryResponse], tags=["telemetry"], summary="Get lap telemetry")
def get_lap_telemetry(lap_id: int, db = Depends(get_db), max_points: int = 2000):
    data_objects = db.query(Telemetry).filter(Telemetry.lap_id == lap_id).order_by(Telemetry.session_time.asc()).limit(100000).all()

    step = max(1, len(data_objects) // max_points)

    return data_objects[::step]


@router.get("/players/{player_id}/best_lap", response_model=LapResponse, tags=["best lap"], summary="Get best lap")
def get_best_lap(player_id: int, track_name: str, db = Depends(get_db)):
    best_lap = db.query(Lap).join(Session).filter(
        Session.player_id == player_id,
        Session.track_name == track_name,
        Lap.lap_time > 0
    ).order_by(Lap.lap_time.asc()).first()
    
    if not best_lap:
        raise HTTPException(status_code=404, detail="Best lap not found")
        
    return best_lap


@router.get("/players/{player_id}/ideal_lap", response_model=IdealLapResponse, tags=["ideal lap"], summary="Get ideal lap")
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


@router.get("/laps/{lap_id}/delta", response_model=list[DeltaPointResponse], tags=["delta"], summary="Get delta between two laps")
def get_lap_delta(lap_id: int, reference_lap_id: int, db = Depends(get_db)):
    cur_data = db.query(Telemetry.lap_dist_pct, Telemetry.session_time).filter(Telemetry.lap_id == lap_id).order_by(Telemetry.session_time.asc()).all()
    ref_data = db.query(Telemetry.lap_dist_pct, Telemetry.session_time).filter(Telemetry.lap_id == reference_lap_id).order_by(Telemetry.session_time.asc()).all()
    
    if not cur_data or not ref_data:
        raise HTTPException(status_code=404, detail="Telemetry not found for one or both laps")
        
    deltas = calculate_delta(cur_data, ref_data)
    
    return deltas


@router.get("/players_history", response_model=list[PlayerResponse], tags=["players_history"], summary="Get all players history")
def get_history(skip: int = 0, limit: int = 10, db = Depends(get_db)):
    players = db.query(Player).options(
        selectinload(Player.sessions)
    ).offset(skip).limit(limit).all()
    return players


