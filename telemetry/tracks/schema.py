from typing import List, Optional

from pydantic import BaseModel, Field


class TurnDefinition(BaseModel):
    turn_number: int = Field(..., description="Official turn number")
    name: str = Field(..., description="Turn display name, e.g. Turn 1 - Hairpin")
    apex_pct: float = Field(..., ge=0.0, le=1.0, description="Nominal apex percentage")
    label: Optional[str] = Field(None, description="Official short corner number (e.g. '10a')")
    x: Optional[float] = Field(None, description="SVG X coordinate of turn apex")
    y: Optional[float] = Field(None, description="SVG Y coordinate of turn apex")


class GeoPoint(BaseModel):
    lat: float = Field(..., description="GPS Latitude")
    lon: float = Field(..., description="GPS Longitude")


class TrackSummaryResponse(BaseModel):
    track_name: str = Field(..., description="Canonical track slug")
    display_name: str = Field(..., description="Human-readable track name")
    length_m: float = Field(..., description="Track length in meters")
    turn_count: int = Field(..., description="Number of official turns")
    track_width_m: float = Field(12.0, description="Track width in meters")
    svg_path: Optional[str] = Field(None, description="Pre-normalized SVG path for mini previews")


class TrackDefinition(BaseModel):
    track_name: str = Field(..., description="Canonical unique track slug, e.g. tsukuba_2000")
    display_name: str = Field(..., description="Human-readable display name")
    length_m: float = Field(..., gt=0.0, description="Track length in meters")
    aliases: List[str] = Field(
        default_factory=list, description="Alternative names and iRacing string IDs"
    )
    track_width_m: float = Field(default=12.0, description="Nominal track width in meters")
    svg_path: Optional[str] = Field(None, description="Pre-normalized SVG path (inside boundary)")
    svg_path_outside: Optional[str] = Field(
        None, description="Outer boundary SVG path for dual-contour tracks"
    )
    svg_offset: Optional[float] = Field(0.0, description="Start/finish offset on the SVG path")
    svg_direction: Optional[int] = Field(1, description="Driving direction on SVG path (1 or -1)")
    view_box: Optional[str] = Field(None, description="SVG viewBox string for the track paths")
    iracing_track_id: Optional[int] = Field(None, description="Official iRacing track config ID")
    start_finish: Optional[dict] = Field(
        None, description="Start/finish line SVG position and driving direction"
    )
    turn_labels: list = Field(
        default_factory=list, description="Named turn label positions with SVG coordinates"
    )
    turns: List[TurnDefinition] = Field(
        default_factory=list, description="Ordered list of official turns"
    )
