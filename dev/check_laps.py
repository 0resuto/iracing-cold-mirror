import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from telemetry.database import engine, Lap
from sqlalchemy.orm import sessionmaker

db = sessionmaker(bind=engine)()
laps = db.query(Lap).order_by(Lap.id.desc()).limit(5).all()
for lap in laps:
    print(f"Lap {lap.lap_number}: {lap.lap_time}")
db.close()
