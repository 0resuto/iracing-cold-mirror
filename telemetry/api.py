from fastapi import FastAPI
from sqlalchemy.orm import sessionmaker
from telemetry.database import engine, Telemetry
from pydantic import BaseModel


DBSession = sessionmaker(bind=engine)

app = FastAPI()


class TelemetryResponse(BaseModel):
    id: int
    speed: float
    rpm: int
    gear: int

    class Config:
        from_attributes = True



@app.get("/api/status")
def get_status():
    return {"status": "ok", "message": "API is running"}

@app.get("/api/telemetry/latest", response_model=list[TelemetryResponse])
def get_latest_telemetry():
    db = DBSession()
    try:
        data_objects = db.query(Telemetry).order_by(Telemetry.id.desc()).limit(10).all()
            
        return data_objects
    finally:
        db.close()