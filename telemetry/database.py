from sqlalchemy import create_engine, Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import declarative_base, relationship


DATABASE_URL = "postgresql://iracing:iracing_local@localhost:5432/telemetry"

engine = create_engine(DATABASE_URL, echo=True)
Base = declarative_base()


class Session(Base):
    __tablename__ = 'sessions'

    id = Column(Integer, primary_key=True)
    track_name = Column(String)
    laps = relationship("Lap", back_populates="session")


class Lap(Base):
    __tablename__ = 'laps'

    id = Column(Integer, primary_key=True)
    session_id = Column(Integer, ForeignKey('sessions.id'))
    lap_number = Column(Integer)
    lap_time = Column(Float)

    session = relationship("Session", back_populates="laps")
    telemetry_data = relationship("Telemetry", back_populates="lap")


class Telemetry(Base):
    __tablename__ = 'telemetry'

    id = Column(Integer, primary_key=True)
    lap_id = Column(Integer, ForeignKey('laps.id'))
    session_time = Column(Float)
    speed = Column(Float)
    rpm = Column(Integer)
    gear = Column(Integer)
    throttle = Column(Float)
    brake = Column(Float)
    wheel_angle = Column(Float)
    lap_dist_pct = Column(Float)

    lap = relationship("Lap", back_populates="telemetry_data")


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print("Таблицы успешно созданы!")