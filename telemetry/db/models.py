from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from telemetry.db import Base


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    sessions = relationship("Session", back_populates="player", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    file_hash = Column(String, unique=True, index=True, nullable=True)
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False, index=True)
    player = relationship("Player", back_populates="sessions")
    track_name = Column(String, nullable=False)
    track_id = Column(Integer, nullable=True, index=True)
    car_name = Column(String, nullable=True)
    start_time = Column(DateTime, nullable=True, default=lambda: datetime.now(timezone.utc))
    duration_seconds = Column(Float, nullable=True, default=0.0)
    laps = relationship("Lap", back_populates="session", cascade="all, delete-orphan")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Lap(Base):
    __tablename__ = "laps"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False, index=True)
    lap_number = Column(Integer, nullable=False)
    lap_time = Column(Float, default=0.0, index=True)

    session = relationship("Session", back_populates="laps")
    telemetry_data = relationship("Telemetry", back_populates="lap", cascade="all, delete-orphan")
    sectors = relationship("Sector", back_populates="lap", cascade="all, delete-orphan")


class Sector(Base):
    __tablename__ = "sectors"

    id = Column(Integer, primary_key=True)
    lap_id = Column(Integer, ForeignKey("laps.id"), nullable=False, index=True)
    sector_number = Column(Integer, nullable=False)
    sector_time = Column(Float, nullable=False)

    lap = relationship("Lap", back_populates="sectors")


class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True)
    lap_id = Column(Integer, ForeignKey("laps.id"), nullable=False, index=True)
    session_time = Column(Float, nullable=False, index=True)
    speed = Column(Float, nullable=False)  # Speed (km/h)
    rpm = Column(Integer, nullable=False)  # Engine RPM
    gear = Column(Integer, nullable=False)  # Current gear
    throttle = Column(Float, nullable=False)  # Throttle input (0.0 to 1.0)
    brake = Column(Float, nullable=False)  # Brake input (0.0 to 1.0)
    wheel_angle = Column(Float, nullable=False)  # Steering wheel angle (rad)
    lap_dist_pct = Column(Float, nullable=False)  # Lap distance percentage (0.0 to 1.0)

    lat = Column(Float, nullable=True)  # GPS Latitude
    lon = Column(Float, nullable=True)  # GPS Longitude

    lat_accel = Column(Float, nullable=True)  # Lateral acceleration (G)
    long_accel = Column(Float, nullable=True)  # Longitudinal acceleration (G)
    yaw_rate = Column(Float, nullable=True)  # Yaw rate (rad/s)
    velocity_x = Column(Float, nullable=True)  # Longitudinal velocity in car's frame (m/s)
    velocity_z = Column(Float, nullable=True)  # Lateral velocity in car's frame (m/s)
    slip_angle = Column(Float, nullable=True)  # Angle between car's nose and direction of travel

    lf_speed = Column(Float, nullable=True)  # Left front wheel speed (m/s)
    rf_speed = Column(Float, nullable=True)  # Right front wheel speed (m/s)
    lr_speed = Column(Float, nullable=True)  # Left rear wheel speed (m/s)
    rr_speed = Column(Float, nullable=True)  # Right rear wheel speed (m/s)

    abs_active = Column(Boolean, default=False, nullable=True)  # ABS active flag
    tc_active = Column(Boolean, default=False, nullable=True)  # Traction Control active flag
    wheel_lock = Column(Boolean, default=False, nullable=True)  # Any wheel locked flag

    lap = relationship("Lap", back_populates="telemetry_data")
