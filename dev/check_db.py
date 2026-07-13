import sys, os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from sqlalchemy.orm import sessionmaker
from telemetry.database import engine, Lap, Session

DBSession = sessionmaker(bind=engine)
db = DBSession()
laps = db.query(Lap).all()
for lap in laps:
    print(f"Lap ID: {lap.id}, Session ID: {lap.session_id}, Number: {lap.lap_number}, Time: {lap.lap_time}")

sessions = db.query(Session).all()
for s in sessions:
    print(f"Session ID: {s.id}, Track: {s.track_name}")

db.close()
