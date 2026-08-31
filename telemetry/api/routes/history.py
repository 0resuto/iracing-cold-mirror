import json
import os
import tempfile
import uuid

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
)
from sqlalchemy import func, text
from sqlalchemy.orm import Session as DBSession
from sqlalchemy.orm import selectinload

from telemetry.api.deps import get_current_admin, get_db, verify_api_key
from telemetry.api.schemas import (
    DeltaPointResponse,
    IdealLapResponse,
    LapResponse,
    PlayerResponse,
    SystemInfoResponse,
    TelemetryResponse,
)
from telemetry.config import settings
from telemetry.db import SessionLocal
from telemetry.db.models import Lap, Player, Sector, Session, Telemetry
from telemetry.redis import redis_sync
from telemetry.services.delta import calculate_delta
from telemetry.services.importer import import_ibt_to_db

router = APIRouter()


def process_file_in_background(tmp_path: str, task_id: str):
    redis_key = f"import:{task_id}"

    def update_progress(current, total):
        if total > 0:
            redis_sync.setex(
                redis_key,
                600,
                json.dumps({"status": "processing", "progress": (current / total) * 100}),
            )

    try:
        success = import_ibt_to_db(tmp_path, SessionLocal, progress_callback=update_progress)
        if success:
            redis_sync.setex(redis_key, 600, json.dumps({"status": "done"}))
        else:
            redis_sync.setex(
                redis_key,
                600,
                json.dumps({"status": "skipped", "message": "File already imported"}),
            )
    except Exception as e:
        redis_sync.setex(redis_key, 600, json.dumps({"status": "error", "message": str(e)}))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@router.get(
    "/laps/{lap_id}/telemetry",
    response_model=list[TelemetryResponse],
    tags=["Laps"],
    summary="Get lap telemetry",
)
def get_lap_telemetry(lap_id: int, db: DBSession = Depends(get_db), max_points: int = 2000):
    total = db.query(func.count(Telemetry.id)).filter(Telemetry.lap_id == lap_id).scalar()
    if total == 0:
        raise HTTPException(status_code=404, detail="Lap not found")

    step = max(1, total // max_points)
    stmt = text("""
        SELECT * FROM (
            SELECT *, ROW_NUMBER() OVER (ORDER BY session_time ASC) as rn
            FROM telemetry
            WHERE lap_id = :lap_id
        ) sub
        WHERE (rn - 1) % :step = 0
        ORDER BY session_time ASC
    """)

    return db.query(Telemetry).from_statement(stmt).params(lap_id=lap_id, step=step).all()


@router.get(
    "/players/{player_id}/best_lap",
    response_model=LapResponse,
    tags=["Players"],
    summary="Get best lap",
)
def get_best_lap(player_id: int, track_name: str, db: DBSession = Depends(get_db)):
    best_lap = (
        db.query(Lap)
        .options(selectinload(Lap.sectors))
        .join(Session)
        .filter(Session.player_id == player_id, Session.track_name == track_name, Lap.lap_time > 0)
        .order_by(Lap.lap_time.asc())
        .first()
    )

    if not best_lap:
        raise HTTPException(status_code=404, detail="Best lap not found")

    return best_lap


@router.get(
    "/players/{player_id}/ideal_lap",
    response_model=IdealLapResponse,
    tags=["Players"],
    summary="Get ideal lap",
)
def get_ideal_lap(player_id: int, track_name: str, db: DBSession = Depends(get_db)):
    best_sectors = (
        db.query(Sector.sector_number, func.min(Sector.sector_time).label("best_time"))
        .join(Lap)
        .join(Session)
        .filter(
            Session.player_id == player_id,
            Session.track_name == track_name,
            Lap.lap_time > 0,
            Sector.sector_time > 0,
        )
        .group_by(Sector.sector_number)
        .order_by(Sector.sector_number.asc())
        .all()
    )

    if not best_sectors:
        raise HTTPException(status_code=404, detail="No sectors found for this track")

    ideal_time = sum(row.best_time for row in best_sectors)

    sectors_list = [
        {"sector_number": row.sector_number, "best_time": row.best_time} for row in best_sectors
    ]

    return {"ideal_lap_time": ideal_time, "sectors": sectors_list}


@router.get(
    "/laps/{lap_id}/delta",
    response_model=list[DeltaPointResponse],
    tags=["Laps"],
    summary="Get delta between two laps",
)
def get_lap_delta(lap_id: int, reference_lap_id: int, db: DBSession = Depends(get_db)):
    """
    Calculates the time delta between a given lap and a reference lap.

    Fetches the lap distance percentages and session times for both laps, and
    computes the time difference (delta) at aligned distance points. A positive
    delta indicates the current lap is slower than the reference.
    """
    cur_data = (
        db.query(Telemetry.lap_dist_pct, Telemetry.session_time)
        .filter(Telemetry.lap_id == lap_id)
        .order_by(Telemetry.session_time.asc())
        .all()
    )
    ref_data = (
        db.query(Telemetry.lap_dist_pct, Telemetry.session_time)
        .filter(Telemetry.lap_id == reference_lap_id)
        .order_by(Telemetry.session_time.asc())
        .all()
    )

    if not cur_data or not ref_data:
        raise HTTPException(status_code=404, detail="Telemetry not found for one or both laps")

    deltas = calculate_delta(cur_data, ref_data)

    return deltas


@router.get(
    "/players_history",
    response_model=list[PlayerResponse],
    tags=["Players"],
    summary="Get all players history",
)
def get_history(skip: int = 0, limit: int = Query(10, le=100), db: DBSession = Depends(get_db)):
    players = (
        db.query(Player)
        .options(selectinload(Player.sessions).selectinload(Session.laps).selectinload(Lap.sectors))
        .offset(skip)
        .limit(limit)
        .all()
    )
    return players


MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB


@router.post(
    "/sessions/upload",
    tags=["Session"],
    summary="Upload and import .ibt telemetry file",
    dependencies=[Depends(verify_api_key)],
)
def upload_file(
    request: Request,
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
):
    if not file.filename.endswith(".ibt"):
        raise HTTPException(status_code=400, detail="Only .ibt files are allowed")
    # Fast header check before data reading
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_SIZE // (1024 * 1024)} MB",
        )
    # Protected writing to disk with real bytes count
    tmp_path = None
    try:
        total_bytes = 0
        with tempfile.NamedTemporaryFile(delete=False, suffix=".ibt") as tmp:
            while chunk := file.file.read(1024 * 1024):
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_SIZE:
                    tmp.close()
                    os.remove(tmp.name)
                    raise HTTPException(
                        status_code=413,
                        detail=f"File too large. Maximum allowed size is {MAX_UPLOAD_SIZE // (1024 * 1024)} MB",
                    )
                tmp.write(chunk)
            tmp_path = tmp.name
        task_id = str(uuid.uuid4())
        redis_sync.setex(f"import:{task_id}", 600, json.dumps({"status": "processing"}))
        background_tasks.add_task(process_file_in_background, tmp_path, task_id)
        return {"status": "accepted", "task_id": task_id}
    except HTTPException:
        raise
    except Exception:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        raise HTTPException(status_code=500, detail="Upload failed mid-stream")


@router.get(
    "/sessions/upload/{task_id}",
    tags=["Session"],
    summary="Check upload status",
)
def get_upload_status(task_id: str):
    redis_key = f"import:{task_id}"
    raw = redis_sync.get(redis_key)
    if not raw:
        raise HTTPException(status_code=404, detail="Task not found")

    status_info = json.loads(raw)

    if status_info["status"] in ["done", "error", "skipped"]:
        redis_sync.delete(redis_key)

    return status_info


@router.get(
    "/system_info",
    response_model=SystemInfoResponse,
    tags=["System"],
    summary="Get system information",
)
def get_system_info(db: DBSession = Depends(get_db)):
    total_players = db.query(func.count(Player.id)).scalar() or 0
    total_sessions = db.query(func.count(Session.id)).scalar() or 0
    total_laps = db.query(func.count(Lap.id)).scalar() or 0
    last_session = db.query(Session).order_by(Session.id.desc()).first()
    last_upload = None
    if last_session:
        last_upload = {
            "session_id": last_session.id,
            "track_name": last_session.track_name or "Unknown Track",
            "player_name": last_session.player.name if last_session.player else "Unknown Player",
            "total_laps": db.query(func.count(Lap.id))
            .filter(Lap.session_id == last_session.id)
            .scalar()
            if last_session
            else 0,
            "created_at": last_session.created_at,
        }
    return SystemInfoResponse(
        status="ok",
        auth_enabled=bool(settings.api_key and settings.api_key.strip()),
        total_players=total_players,
        total_sessions=total_sessions,
        total_laps=total_laps,
        last_upload=last_upload,
    )


@router.delete(
    "/sessions/{session_id}",
    tags=["Session"],
    summary="Delete telemetry session (Admin only)",
    dependencies=[Depends(get_current_admin)],
)
def delete_session(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    player_id = session.player_id
    db.delete(session)

    remaining_sessions = (
        db.query(Session).filter(Session.player_id == player_id, Session.id != session_id).count()
    )
    if remaining_sessions == 0:
        player = db.query(Player).filter(Player.id == player_id).first()
        if player:
            db.delete(player)

    db.commit()

    return {"status": "deleted", "session_id": session_id}
