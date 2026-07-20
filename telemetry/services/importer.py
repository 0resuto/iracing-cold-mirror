from telemetry.collector.ibt_reader import IBTReader
from telemetry.db.models import Session as RacingSession, Lap as RacingLap, Telemetry, Player, Sector
import time
from telemetry.db import SessionLocal as DBSession
import logging
import hashlib
import os


def get_file_hash(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def import_ibt_to_db(file_path: str, db_session_factory):
    reader = IBTReader(file_path=file_path, loop=False)
    db =  db_session_factory()

    file_hash = get_file_hash(file_path)
    existing_session = db.query(RacingSession).filter_by(file_hash=file_hash).first()
    if existing_session:
        logger.info(f"Skipping {file_path} - already imported (Hash: {file_hash})")
        db.close()
        return False

    batch = []

    lap = 1
    lap_current_lap_time = 0
    last_lap_dist_pct = 0.0
    lap_last_lap_time = 0.0
    sectors = getattr(reader, 'sectors', [])
    current_sector_id = 0
    sector_start_time = 0.0

    player_name = getattr(reader, 'player_name', "Unknown Player")
    track_name = getattr(reader, 'track_name', "Unknown Track")
    sectors_info = getattr(reader, 'sectors', [])

    player = db.query(Player).filter_by(name=player_name).first()

    if not player:
        player = Player(name=player_name)
        db.add(player)
        db.commit()

    current_session = RacingSession(
        track_name=track_name,
        player_id=player.id,
        file_hash=file_hash
    )
    db.add(current_session)
    db.commit()

    current_lap = RacingLap(session_id=current_session.id, lap_number=lap, lap_time=0.0)
    db.add(current_lap)
    db.commit()

    while True:
        data = reader.read()
        if data is None:
            break

        lap_current_lap_time = data.get("session_time", 0.0)

        if last_lap_dist_pct > 0.8 and data["lap_dist_pct"] < 0.2:
            if lap_last_lap_time == 0.0:
                current_lap.lap_time = -1.0  # Outlap
            else:
                current_lap.lap_time = lap_last_lap_time
            db.commit()
            
            current_sector_time = lap_current_lap_time - sector_start_time
            
            new_sector = Sector(
                lap_id=current_lap.id,
                sector_number=current_sector_id,
                sector_time=current_sector_time
            )
            db.add(new_sector)
            db.commit()
            
            current_sector_id = 0
            sector_start_time = lap_current_lap_time
            lap += 1
            current_lap = RacingLap(session_id=current_session.id, lap_number=lap, lap_time=0.0)
            db.add(current_lap)
            db.commit()

        next_sector_id = current_sector_id + 1

        if len(sectors) > 1 and next_sector_id < len(sectors):
            next_sector_start_time = sectors[next_sector_id]["SectorStartPct"]
            if data["lap_dist_pct"] >= next_sector_start_time:
                current_sector_time = lap_current_lap_time - sector_start_time
                
                new_sector = Sector(
                    lap_id=current_lap.id,
                    sector_number=current_sector_id,
                    sector_time=current_sector_time
                )
                db.add(new_sector)
                db.commit()
                    
                current_sector_id = next_sector_id
                sector_start_time = lap_current_lap_time
            
        last_lap_dist_pct = data["lap_dist_pct"]
        lap_last_lap_time = lap_current_lap_time

        new_data = Telemetry(
            lap_id=current_lap.id,
            session_time=lap_current_lap_time,
            speed=data["speed"],
            rpm=data["rpm"],
            gear=data["gear"],
            throttle=data["throttle"],
            brake=data["brake"],
            wheel_angle=data["wheel_angle"],
            lap_dist_pct=data.get("lap_dist_pct"),
            lat=data.get("lat"),
            lon=data.get("lon"),
            lat_accel=data.get("g_lat"),
            long_accel=data.get("g_lon"),
            yaw_rate=data.get("yaw_rate"),
            velocity_x=data.get("vx"),
            velocity_z=data.get("vz"),
            slip_angle=data.get("slip_angle"),
            lf_speed=data.get("lf_speed"),
            rf_speed=data.get("rf_speed"),
            lr_speed=data.get("lr_speed"),
            rr_speed=data.get("rr_speed"),
            abs_active=data.get("abs_active"),
            tc_active=data.get("tc_active"),
            wheel_lock=data.get("wheel_lock"),
        )

        batch.append(new_data)

        if len(batch) >= 1000:
            for attempt in range(3):
                try:
                    db.bulk_save_objects(batch)
                    db.commit()
                    break
                except Exception as e:
                    db.rollback()
                    if attempt == 2:
                        logger.error(f"Failed to save batch after 3 attempts: {e}")
                    else:
                        sleep_time = 2 ** attempt    
                        logger.error(f"DB Worker error: {e}")
                        logger.warning(f"DB Error: {e}. Retrying in {sleep_time}s...")
                        time.sleep(sleep_time)
            batch.clear()
        
    if len(batch) > 0:
        db.bulk_save_objects(batch)
        db.commit()

    db.close()
    print("Import completed!")
    