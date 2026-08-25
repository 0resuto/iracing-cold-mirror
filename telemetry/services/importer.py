import hashlib
import logging
from typing import NamedTuple

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


logger = logging.getLogger(__name__)


def _get_or_create_player(db, player_name: str) -> Player:
    player = db.query(Player).filter_by(name=player_name).first()
    if not player:
        player = Player(name=player_name)
        db.add(player)
        db.flush()
    return player


def _create_session(
    db, player_id: int, track_name: str, car_name: str, file_hash: str
) -> RacingSession:
    session = RacingSession(
        track_name=track_name, player_id=player_id, car_name=car_name, file_hash=file_hash
    )
    db.add(session)
    db.flush()
    return session


def _build_telemetry(lap_id: int, session_time: float, data: dict) -> Telemetry:
    return Telemetry(
        lap_id=lap_id,
        session_time=session_time,
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
        abs_active=bool(data.get("abs_active")),
        tc_active=bool(data.get("tc_active")),
        wheel_lock=bool(data.get("wheel_lock")),
    )


class LapTransitionResult(NamedTuple):
    lap: RacingLap
    sector_id: int
    sector_start_time: float
    lap_number: int
    lap_start_time: float


def _handle_lap_transition(
    db,
    data,
    current_lap,
    lap_last_lap_time,
    sector_start_time,
    lap_start_time,
    current_sector_id,
    current_lap_num,
    current_session,
):
    actual_lap_time = lap_last_lap_time - lap_start_time

    if actual_lap_time < 15.0 or actual_lap_time == 0.0:
        current_lap.lap_time = -1.0
    else:
        current_lap.lap_time = actual_lap_time

    db.flush()
    current_sector_time = lap_last_lap_time - sector_start_time
    new_sector = Sector(
        lap_id=current_lap.id,
        sector_number=current_sector_id,
        sector_time=current_sector_time,
    )
    db.add(new_sector)
    db.flush()
    iracing_lap = data.get("lap")
    if iracing_lap is not None and iracing_lap > current_lap_num:
        new_lap_num = iracing_lap
    else:
        new_lap_num = current_lap_num + 1
    new_lap = RacingLap(session_id=current_session.id, lap_number=new_lap_num, lap_time=0.0)
    db.add(new_lap)
    db.flush()

    return LapTransitionResult(
        lap=new_lap,
        sector_id=0,
        sector_start_time=lap_last_lap_time,
        lap_number=new_lap_num,
        lap_start_time=lap_last_lap_time,
    )


def import_ibt_to_db(file_path: str, db_session_factory, progress_callback=None):
    reader = IBTReader(file_path=file_path)
    db = db_session_factory()

    file_hash = get_file_hash(file_path)
    existing_session = db.query(RacingSession).filter_by(file_hash=file_hash).first()
    if existing_session:
        logger.info(f"Skipping {file_path} - already imported (Hash: {file_hash})")
        db.close()
        return False

    pbar = None
    try:
        batch = []

        lap_current_lap_time = 0
        last_lap_dist_pct = 0.0
        lap_last_lap_time = 0.0
        lap_start_time = 0.0
        sectors = getattr(reader, "sectors", [])
        current_sector_id = 0
        sector_start_time = 0.0
        player_name = getattr(reader, "player_name", "Unknown Player")
        track_name = getattr(reader, "track_name", "Unknown Track")
        car_name = getattr(reader, "car_name", "Unknown Car")

        player = _get_or_create_player(db, player_name)
        current_session = _create_session(db, player.id, track_name, car_name, file_hash)
        db.flush()

        # Read first frame to determine initial iRacing lap number (0 for Outlap, 1 for Lap 1)
        first_data = reader.read()
        if first_data is None:
            return False

        current_lap_num = first_data.get("lap", 0)

        lap_start_time = first_data.get("session_time", 0.0)
        sector_start_time = lap_start_time

        current_lap = RacingLap(
            session_id=current_session.id, lap_number=current_lap_num, lap_time=0.0
        )
        db.add(current_lap)
        db.flush()
        # Process telemetry frames starting with first_data
        total_samples = getattr(reader, "num_samples", 0)
        pbar = tqdm(total=total_samples, desc="Importing IBT telemetry", unit="frames")

        data = first_data
        frames_processed = 0

        while data is not None:
            pbar.update(1)
            frames_processed += 1

            if progress_callback and frames_processed % 5000 == 0:
                progress_callback(frames_processed, total_samples)

            lap_current_lap_time = data.get("session_time", 0.0)
            lap_dist_pct = data.get("lap_dist_pct", 0.0)

            if last_lap_dist_pct > 0.8 and lap_dist_pct < 0.2:
                transition = _handle_lap_transition(
                    db=db,
                    data=data,
                    current_lap=current_lap,
                    lap_last_lap_time=lap_last_lap_time,
                    sector_start_time=sector_start_time,
                    lap_start_time=lap_start_time,
                    current_sector_id=current_sector_id,
                    current_lap_num=current_lap_num,
                    current_session=current_session,
                )
                current_lap = transition.lap
                current_sector_id = transition.sector_id
                sector_start_time = transition.sector_start_time
                current_lap_num = transition.lap_number
                lap_start_time = transition.lap_start_time

            next_sector_id = current_sector_id + 1

            if len(sectors) > 1 and next_sector_id < len(sectors):
                next_sector_start_time = sectors[next_sector_id]["SectorStartPct"]
                if lap_dist_pct >= next_sector_start_time:
                    current_sector_time = lap_current_lap_time - sector_start_time

                    new_sector = Sector(
                        lap_id=current_lap.id,
                        sector_number=current_sector_id,
                        sector_time=current_sector_time,
                    )
                    db.add(new_sector)
                    db.flush()

                    current_sector_id = next_sector_id
                    sector_start_time = lap_current_lap_time

            last_lap_dist_pct = lap_dist_pct
            lap_last_lap_time = lap_current_lap_time

            batch.append(_build_telemetry(current_lap.id, lap_current_lap_time, data))

            if len(batch) >= 10000:
                db.add_all(batch)
                db.flush()
                batch.clear()

            data = reader.read()

        if current_lap and current_lap.lap_time == 0.0:
            current_lap.lap_time = -1.0
            db.flush()

        if len(batch) > 0:
            db.add_all(batch)

        if current_session:
            current_session.duration_seconds = lap_last_lap_time

        db.commit()
        logger.info("Import completed!")
        return True

    except Exception as e:
        db.rollback()
        logger.error(f"Import failed: {e}", exc_info=True)
        raise

    finally:
        if pbar:
            pbar.close()
        db.close()
        reader.close()
