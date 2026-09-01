import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DBSession

from telemetry.api.deps import get_current_admin, get_db
from telemetry.db.models import Lap, Session, Telemetry
from telemetry.redis import redis_sync
from telemetry.services.ai_coach import generate_coach_insights
from telemetry.services.analyzer import extract_lap_corners

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["AI Coach"])


class AnalyzeLapRequest(BaseModel):
    lap_id: int = Field(..., description="Lap ID to analyze")
    reference_lap_id: int | None = Field(None, description="Optional reference lap ID")


@router.post("/analyze-lap", summary="Analyze lap telemetry with AI")
def analyze_lap(
    request: AnalyzeLapRequest,
    admin: dict = Depends(get_current_admin),
    db: DBSession = Depends(get_db),
):
    """
    Performs physics feature extraction and queries LLM for driving coach insights.
    Results are cached in Redis for 1 day.
    """
    cur_lap = db.query(Lap).filter(Lap.id == request.lap_id).first()
    if not cur_lap:
        raise HTTPException(status_code=404, detail="Selected lap not found")

    # Match reference lap or default to best lap of the track
    ref_lap = None
    if request.reference_lap_id:
        ref_lap = db.query(Lap).filter(Lap.id == request.reference_lap_id).first()

    if not ref_lap:
        cur_session = db.query(Session).filter(Session.id == cur_lap.session_id).first()
        if cur_session:
            ref_lap = (
                db.query(Lap)
                .join(Session)
                .filter(
                    Session.track_name == cur_session.track_name,
                    Session.car_name == cur_session.car_name,
                    Lap.lap_time > 0,
                )
                .order_by(Lap.lap_time.asc())
                .first()
            )

    if not ref_lap:
        raise HTTPException(status_code=400, detail="No suitable reference lap found")

    # Check Redis cache
    cache_key = f"ai_analysis:{cur_lap.id}:{ref_lap.id}"
    cached_data = redis_sync.get(cache_key)
    if cached_data:
        try:
            return json.loads(cached_data)
        except Exception:
            pass

    # Fetch telemetry samples from database
    cur_telemetry = (
        db.query(Telemetry)
        .filter(Telemetry.lap_id == cur_lap.id)
        .order_by(Telemetry.session_time.asc())
        .all()
    )
    ref_telemetry = (
        db.query(Telemetry)
        .filter(Telemetry.lap_id == ref_lap.id)
        .order_by(Telemetry.session_time.asc())
        .all()
    )

    if not cur_telemetry or not ref_telemetry:
        raise HTTPException(status_code=404, detail="Telemetry points missing for analysis")

    # Physics feature extraction
    session_obj = db.query(Session).filter(Session.id == cur_lap.session_id).first()
    track_name = session_obj.track_name if session_obj else "Unknown Track"
    car_name = session_obj.car_name if session_obj else "Unknown Car"

    track_length = session_obj.track_length if session_obj else None
    corners_data = extract_lap_corners(
        cur_telemetry=cur_telemetry,
        ref_telemetry=ref_telemetry,
        track_name=track_name,
        track_length=track_length,
    )

    # Generate AI insights
    try:
        analysis_result = generate_coach_insights(
            track_name=track_name,
            car_name=car_name,
            lap_time=cur_lap.lap_time,
            ref_lap_time=ref_lap.lap_time,
            corners_data=corners_data,
        )
    except Exception as e:
        logger.error(f"Failed to generate AI insights: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"AI Engine error: {str(e)}")

    # Cache response in Redis for 1 day (86400 seconds)
    redis_sync.setex(cache_key, 86400, json.dumps(analysis_result))

    return analysis_result
