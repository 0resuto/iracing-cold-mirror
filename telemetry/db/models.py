from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from telemetry.db import Base, engine


class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)

    sessions = relationship("Session", back_populates="player", cascade="all, delete-orphan")


class Session(Base):
    __tablename__ = "sessions"

    file_hash = Column(String, unique=True, index=True, nullable=True)
    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"))
    player = relationship("Player", back_populates="sessions")
    track_name = Column(String)
    laps = relationship("Lap", back_populates="session")


class Lap(Base):
    __tablename__ = "laps"

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey("sessions.id"))
    lap_number = Column(Integer)
    lap_time = Column(Float)

    session = relationship("Session", back_populates="laps")
    telemetry_data = relationship("Telemetry", back_populates="lap")
    sectors = relationship("Sector", back_populates="lap")


class Sector(Base):
    __tablename__ = "sectors"

    id = Column(Integer, primary_key=True)
    lap_id = Column(Integer, ForeignKey("laps.id"))
    sector_number = Column(Integer)
    sector_time = Column(Float)

    lap = relationship("Lap", back_populates="sectors")


class Telemetry(Base):
    __tablename__ = "telemetry"

    id = Column(Integer, primary_key=True)
    lap_id = Column(Integer, ForeignKey("laps.id"), index=True)
    session_time = Column(Float, index=True)
    speed = Column(Float)  # Speed (km/h)
    rpm = Column(Integer)  # Engine RPM
    gear = Column(Integer)  # Current gear
    throttle = Column(Float)  # Throttle input (0.0 to 1.0)
    brake = Column(Float)  # Brake input (0.0 to 1.0)
    wheel_angle = Column(Float)  # Steering wheel angle (rad)
    lap_dist_pct = Column(Float)  # Lap distance percentage (0.0 to 1.0)

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

    abs_active = Column(Float, nullable=True)  # ABS active flag (0.0 or 1.0)
    tc_active = Column(Float, nullable=True)  # Traction Control active flag (0.0 or 1.0)
    wheel_lock = Column(Float, nullable=True)  # Any wheel locked flag (0.0 or 1.0)

    lap = relationship("Lap", back_populates="telemetry_data")


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print("Tables successfully created!")
