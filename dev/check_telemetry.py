import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from telemetry.database import engine, Lap, Telemetry
from sqlalchemy.orm import sessionmaker

db = sessionmaker(bind=engine)()
laps = db.query(Lap).all()
for lap in laps:
    count = db.query(Telemetry).filter_by(lap_id=lap.id).count()
    print(f"Lap {lap.lap_number}: {count} telemetry points")
db.close()
