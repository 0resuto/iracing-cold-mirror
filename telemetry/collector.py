from sqlalchemy.orm import sessionmaker
from telemetry.database import engine, Session as RacingSession, Lap as RacingLap, Telemetry, Player, Sector
import redis
import time
import json
from queue import Queue, Empty
import threading
from telemetry.config import settings
from telemetry.database import DBSession
from telemetry.redis_client import redis_client


def db_worker(q, db_session_factory):
    db = db_session_factory()
    batch = []
    while True:
        try:
            data = q.get(timeout=1.0)
            if data is None:
                break
            batch.append(data)
        except Empty:
            pass
        
        if len(batch) >= 100 or (len(batch) > 0 and q.empty()):
            try:
                db.bulk_save_objects(batch)
                db.commit()
            except Exception as e:
                print(f"DB Worker error: {e}")
                db.rollback()
            finally:
                batch.clear()


def run(reader, track_name="Unknown Track", track_length=5150, player_name="Unknown Player"):
    db = DBSession()
    lap = 1
    lap_current_lap_time = 0
    last_lap_dist_pct = 0.0
    lap_last_lap_time = 0.0
    sectors = getattr(reader, 'sectors', [])
    current_sector_id = 0
    sector_start_time = 0.0

    try:
        player = db.query(Player).filter_by(name=player_name).first()

        if not player:
            player = Player(name=player_name)
            db.add(player)
            db.commit()

        current_session = RacingSession(track_name=track_name, player_id=player.id)
        db.add(current_session)
        db.commit()

        current_lap = RacingLap(session_id=current_session.id, lap_number=lap, lap_time=0.0)
        db.add(current_lap)
        db.commit()

        telemetry_queue = Queue()
        worker_thread = threading.Thread(target=db_worker, args=(telemetry_queue, DBSession))
        worker_thread.start()

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
                sector_start_time = 0.0
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

            live_data = {
                "lap_number": lap,
                "speed": data["speed"],
                "rpm": data["rpm"],
                "gear": data["gear"],
                "throttle": data["throttle"],
                "brake": data["brake"],
                "wheel_angle": data["wheel_angle"],
                "session_time": lap_current_lap_time,
                "lap_dist_pct": data.get("lap_dist_pct"),
                "lat": data.get("lat"),
                "lon": data.get("lon"),
                "lat_accel": data.get("g_lat"),
                "long_accel": data.get("g_lon"),
                "yaw_rate": data.get("yaw_rate"),
                "velocity_x": data.get("vx"),
                "velocity_z": data.get("vz"),
                "slip_angle": data.get("slip_angle"),
                "lf_speed": data.get("lf_speed"),
                "rf_speed": data.get("rf_speed"),
                "lr_speed": data.get("lr_speed"),
                "rr_speed": data.get("rr_speed"),
                "abs_active": data.get("abs_active"),
                "tc_active": data.get("tc_active"),
                "wheel_lock": data.get("wheel_lock"),
            }

            redis_client.set("telemetry:latest", json.dumps(live_data))

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

            telemetry_queue.put(new_data)

            time.sleep(0.016)

    except KeyboardInterrupt:
        print("Stopped by user")
    except Exception as e:
        print(f"Unexpected error in collector: {e}")
    finally:
        print("Exiting...")
        telemetry_queue.put(None)
        
        if 'worker_thread' in locals() and worker_thread.is_alive():
            worker_thread.join()
            
        db.close()