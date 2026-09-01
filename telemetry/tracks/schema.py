from typing import List, Optional

from pydantic import BaseModel, Field


class TurnDefinition(BaseModel):
    """
    Defines a single corner on a racing track.

    start_pct: Track distance percentage where braking/entry begins (0.0 - 1.0).
    apex_pct: Nominal apex location (0.0 - 1.0).
    end_pct: Track distance percentage where corner exit/acceleration completes (0.0 - 1.0).
    """

    turn_number: int = Field(..., description="Official turn number")
    name: str = Field(..., description="Turn display name, e.g. Turn 1 - Hairpin")
    start_pct: float = Field(..., ge=0.0, le=1.0, description="Start lap distance percentage")
    apex_pct: float = Field(..., ge=0.0, le=1.0, description="Nominal apex percentage")
    end_pct: float = Field(..., ge=0.0, le=1.0, description="End lap distance percentage")
    turn_type: str = Field(
        default="corner", description="Type: hairpin, chicane, sweeper, kink, corner"
    )


class GeoPoint(BaseModel):
    lat: float = Field(..., description="GPS Latitude")
    lon: float = Field(..., description="GPS Longitude")
    alt: Optional[float] = Field(None, description="Altitude in meters")


class TrackSummaryResponse(BaseModel):
    track_name: str = Field(..., description="Canonical track slug")
    display_name: str = Field(..., description="Human-readable track name")
    length_m: float = Field(..., description="Track length in meters")
    turn_count: int = Field(..., description="Number of official turns")
    track_width_m: float = Field(12.0, description="Track width in meters")
    has_centerline: bool = Field(False, description="True if real GPS road centerline is available")
    svg_path: Optional[str] = Field(None, description="Pre-normalized SVG path for mini previews")


class TrackDefinition(BaseModel):
    track_name: str = Field(..., description="Canonical unique track slug, e.g. tsukuba_2000")
    display_name: str = Field(..., description="Human-readable display name")
    length_m: float = Field(..., gt=0.0, description="Track length in meters")
    aliases: List[str] = Field(
        default_factory=list, description="Alternative names and iRacing string IDs"
    )
    track_width_m: float = Field(default=12.0, description="Nominal track width in meters")
    svg_path: Optional[str] = Field(None, description="Pre-normalized SVG path for mini previews")
    turns: List[TurnDefinition] = Field(
        default_factory=list, description="Ordered list of official turns"
    )
    centerline: List[GeoPoint] = Field(
        default_factory=list, description="Physical road centerline GPS nodes"
    )
    pit_lane: List[GeoPoint] = Field(default_factory=list, description="Pit lane GPS nodes")
