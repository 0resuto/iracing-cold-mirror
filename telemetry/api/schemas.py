from pydantic import BaseModel, ConfigDict, Field


class TelemetryResponse(BaseModel):
    id: int = Field(..., description="Unique identifier for the telemetry record")
    speed: float = Field(..., description="Speed (km/h)")
    rpm: int = Field(..., description="Engine revolutions per minute")
    gear: int = Field(..., description="Current gear")
    throttle: float = Field(..., description="Throttle pedal input (from 0.0 to 1.0)")
    brake: float = Field(..., description="Brake pedal input (from 0.0 to 1.0)")
    wheel_angle: float = Field(..., description="Steering wheel angle (rad)")
    session_time: float = Field(..., description="Session time")
    lap_dist_pct: float = Field(
        ..., description="Percentage of lap distance completed (from 0.0 to 1.0)"
    )
    lat: float | None = Field(None, description="GPS Latitude")
    lon: float | None = Field(None, description="GPS Longitude")
    lat_accel: float | None = Field(None, description="Lateral acceleration (G)")
    long_accel: float | None = Field(None, description="Longitudinal acceleration (G)")
    yaw_rate: float | None = Field(None, description="Yaw rate (rad/s)")
    velocity_x: float | None = Field(
        None, description="Longitudinal velocity in the car's coordinate system (m/s)"
    )
    velocity_z: float | None = Field(
        None, description="Lateral velocity in the car's coordinate system (m/s)"
    )
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
