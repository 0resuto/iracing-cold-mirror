from fastapi import FastAPI
from sqlalchemy.orm import sessionmaker
from telemetry.database import engine, Telemetry 

DBSession = sessionmaker(bind=engine)

app = FastAPI()

@app.get("/api/status")
def get_status():
    return {"status": "ok", "message": "API is running"}

@app.get("/api/telemetry/latest")
def get_latest_telemetry():
    db = DBSession()
    try:
        data_objects = db.query(Telemetry).order_by(Telemetry.id.desc()).limit(10).all()
        
        result = []
        for item in data_objects:
            result.append({
                "id": item.id,
                "speed": item.speed,
                "rpm": item.rpm,
                "gear": item.gear
            })
            
        return result
    finally:
        db.close()