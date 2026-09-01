from typing import List

from fastapi import APIRouter, HTTPException

from telemetry.tracks import get_track_definition, track_registry
from telemetry.tracks.schema import TrackDefinition, TrackSummaryResponse

router = APIRouter(prefix="/tracks", tags=["Tracks"])


@router.get("", response_model=List[TrackSummaryResponse], summary="List all available tracks")
def list_tracks() -> List[TrackSummaryResponse]:
    all_tracks = track_registry.list_all()
    summaries = []
    for t in all_tracks:
        summaries.append(
            TrackSummaryResponse(
                track_name=t.track_name,
                display_name=t.display_name,
                length_m=t.length_m,
                turn_count=len(t.turns),
                track_width_m=t.track_width_m,
                has_centerline=len(t.centerline) > 0,
                svg_path=t.svg_path,
            )
        )
    return summaries


@router.get("/{track_name}", response_model=TrackDefinition, summary="Get full track definition")
def get_track(track_name: str) -> TrackDefinition:
    track = get_track_definition(track_name)
    if not track:
        raise HTTPException(status_code=404, detail=f"Track '{track_name}' not found in registry")
    return track
