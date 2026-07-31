import hashlib
import logging

from tqdm import tqdm

from telemetry.collector.ibt_reader import IBTReader
from telemetry.db.models import (
    Lap as RacingLap,
)
from telemetry.db.models import (
    Player,
    Sector,
    Telemetry,
)
from telemetry.db.models import (
    Session as RacingSession,
)


def get_file_hash(file_path: str) -> str:
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        for chunk in iter(lambda: f.read(4096), b""):
            sha256.update(chunk)
    return sha256.hexdigest()


logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def import_ibt_to_db(file_path: str, db_session_factory):
    """
    Parses an iRacing .ibt telemetry file and imports its data into PostgreSQL.

    Reads historical telemetry data frame by frame, grouping it into sessions,
    laps, and sectors. Uses file hashing to prevent duplicate imports and
    inserts data in batches to optimize database performance.
    """
    reader = IBTReader(file_path=file_path, loop=False)
    db = db_session_factory()

    file_hash = get_file_hash(file_path)
    existing_session = db.query(RacingSession).filter_by(file_hash=file_hash).first()
    if existing_session:
        logger.info(f"Skipping {file_path} - already imported (Hash: {file_hash})")
        db.close()
        return False

    batch = []

    lap_current_lap_time = 0
    last_lap_dist_pct = 0.0
    lap_last_lap_time = 0.0
    sectors = getattr(reader, "sectors", [])
    current_sector_id = 0
    sector_start_time = 0.0
    player_name = getattr(reader, "player_name", "Unknown Player")
    track_name = getattr(reader, "track_name", "Unknown Track")
    car_name = getattr(reader, "car_name", "Unknown Car")

    player = db.query(Player).filter_by(name=player_name).first()

    if not player:
        player = Player(name=player_name)
        db.add(player)
        db.commit()

    current_session = RacingSession(
        track_name=track_name, player_id=player.id, car_name=car_name, file_hash=file_hash
    )
    db.add(current_session)
    db.commit()

    # Read first frame to determine initial iRacing lap number (0 for Outlap, 1 for Lap 1)
    first_data = reader.read()
    if first_data is None:
        db.close()
        return False

    current_lap_num = first_data.get("lap", 0)
    current_lap = RacingLap(session_id=current_session.id, lap_number=current_lap_num, lap_time=0.0)
    db.add(current_lap)
    db.commit()

    # Process telemetry frames starting with first_data
    total_samples = getattr(reader, "num_samples", 0)
    pbar = tqdm(total=total_samples, desc="Importing IBT telemetry", unit="frames")

    data = first_data
    while data is not None:
        pbar.update(1)
        lap_current_lap_time = data.get("session_time", 0.0)

        if last_lap_dist_pct > 0.8 and data["lap_dist_pct"] < 0.2:
            # If lap duration is less than 15s (e.g. spawned near finish line), treat as Outlap (-1.0)
            if lap_last_lap_time < 15.0 or lap_last_lap_time == 0.0:
                current_lap.lap_time = -1.0  # Outlap
            else:
                current_lap.lap_time = lap_last_lap_time
            db.commit()

            current_sector_time = lap_last_lap_time - sector_start_time

            new_sector = Sector(
                lap_id=current_lap.id,
                sector_number=current_sector_id,
                sector_time=current_sector_time,
            )
            db.add(new_sector)
            db.commit()

            current_sector_id = 0
            sector_start_time = 0.0

            # Use iRacing's official lap number if available, otherwise increment
            iracing_lap = data.get("lap")
            if iracing_lap is not None and iracing_lap > current_lap_num:
                current_lap_num = iracing_lap
            else:
                current_lap_num += 1

            current_lap = RacingLap(
                session_id=current_session.id, lap_number=current_lap_num, lap_time=0.0
            )
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
                    sector_time=current_sector_time,
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

        if len(batch) >= 10000:
            db.bulk_save_objects(batch)
            db.flush()
            batch.clear()

        data = reader.read()

    pbar.close()

    if current_lap and current_lap.lap_time == 0.0:
        current_lap.lap_time = -1.0
        db.commit()

    if len(batch) > 0:
        db.bulk_save_objects(batch)

    if current_session:
        current_session.duration_seconds = lap_last_lap_time

    db.commit()
    db.close()
    print("Import completed!")
