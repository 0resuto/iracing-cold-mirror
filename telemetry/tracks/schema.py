from typing import List

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


class TrackDefinition(BaseModel):
    track_name: str = Field(..., description="Canonical unique track slug, e.g. tsukuba_2000")
    display_name: str = Field(..., description="Human-readable display name")
    length_m: float = Field(..., gt=0.0, description="Track length in meters")
    aliases: List[str] = Field(
        default_factory=list, description="Alternative names and iRacing string IDs"
    )
    turns: List[TurnDefinition] = Field(
        default_factory=list, description="Ordered list of official turns"
    )
