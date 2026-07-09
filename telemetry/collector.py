from sqlalchemy.orm import sessionmaker
from telemetry.database import engine, Session as RacingSession, Lap as RacingLap, Telemetry, Player
import redis
import time
import json


DBSession = sessionmaker(bind=engine)
redis_client = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

def run(reader, track_name="Unknown Track", track_length=5150, player_name="Unknown Player"):
    db = DBSession()
    lap = 1
    lap_dist = 0
    lap_current_lap_time = 0

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

        while True:
            data = reader.read()
            lap_current_lap_time += 0.5
            lap_dist += data["speed"] / 3.6 * 0.5 
            lap_dist_pct = lap_dist / track_length
            if hasattr(reader, 'set_lap_dist_pct'):
                reader.set_lap_dist_pct(lap_dist_pct)

            if lap_dist >= track_length:
                current_lap.lap_time = lap_current_lap_time
                db.commit()
                lap_dist = 0
                lap_current_lap_time = 0
                lap += 1
                current_lap = RacingLap(session_id=current_session.id, lap_number=lap, lap_time=0.0)
                db.add(current_lap)
                db.commit()

            live_data = {
                "speed": data["speed"],
                "rpm": data["rpm"],
                "gear": data["gear"],
                "throttle": data["throttle"],
                "brake": data["brake"],
                "wheel_angle": data["wheel_angle"],
                "session_time": lap_current_lap_time,
                "lap_dist_pct": lap_dist_pct,
                "lat": data.get("lat"),
                "lon": data.get("lon"),
                "lat_accel": data.get("lat_accel"),
                "long_accel": data.get("long_accel"),
                "yaw_rate": data.get("yaw_rate"),
                "velocity_x": data.get("velocity_x"),
                "velocity_z": data.get("velocity_z"),
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
                lap_dist_pct=lap_dist_pct,
                lat=data.get("lat"),
                lon=data.get("lon"),
                lat_accel=data.get("lat_accel"),
                long_accel=data.get("long_accel"),
                yaw_rate=data.get("yaw_rate"),
                velocity_x=data.get("velocity_x"),
                velocity_z=data.get("velocity_z"),
                slip_angle=data.get("slip_angle"),
                lf_speed=data.get("lf_speed"),
                rf_speed=data.get("rf_speed"),
                lr_speed=data.get("lr_speed"),
                rr_speed=data.get("rr_speed"),
                abs_active=data.get("abs_active"),
                tc_active=data.get("tc_active"),
                wheel_lock=data.get("wheel_lock"),
            )
            db.add(new_data)
            db.commit()

            time.sleep(0.5)

    except KeyboardInterrupt:
        print("Exiting...")