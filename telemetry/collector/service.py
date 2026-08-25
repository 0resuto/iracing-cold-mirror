import json
import logging
import sys
import time

from websockets.exceptions import WebSocketException
from websockets.sync.client import connect

from telemetry.config import settings

logger = logging.getLogger(__name__)


def run(reader):
    lap = 1
    lap_current_lap_time = 0
    last_lap_dist_pct = 0.0
    sectors = getattr(reader, "sectors", [])
    current_sector_id = 0

    ws_url = (
        settings.server_url.replace("https://", "wss://").replace("http://", "ws://")
        + "/api/v1/ws/telemetry/publish"
    )
    headers = (
        {"X-API-Key": settings.api_key} if settings.api_key and settings.api_key.strip() else {}
    )

    while True:
        try:
            with connect(ws_url, additional_headers=headers) as ws:
                logger.info("Connected to server")

                packet_count = 0

                while True:
                    data = reader.read()
                    if data is None:
                        return

                    lap_current_lap_time = data.get("session_time", 0.0)

                    if last_lap_dist_pct > 0.8 and data.get("lap_dist_pct", 0.0) < 0.2:
                        current_sector_id = 0
                        lap += 1

                    next_sector_id = current_sector_id + 1

                    if len(sectors) > 1 and next_sector_id < len(sectors):
                        next_sector_start_time = sectors[next_sector_id]["SectorStartPct"]
                        if data.get("lap_dist_pct", 0.0) >= next_sector_start_time:
                            current_sector_id = next_sector_id

                    last_lap_dist_pct = data.get("lap_dist_pct", 0.0)

                    live_data = {
                        "track_id": getattr(reader, "track_id", None),
                        "track_name": getattr(reader, "track_name", "Unknown Track"),
                        "player_name": getattr(reader, "player_name", "Unknown Player"),
                        "car_name": getattr(reader, "car_name", "Unknown Car"),
                        "lap_number": lap,
                        "speed": data.get("speed", 0.0),
                        "rpm": data.get("rpm", 0.0),
                        "gear": data.get("gear", 0),
                        "throttle": data.get("throttle", 0.0),
                        "brake": data.get("brake", 0.0),
                        "wheel_angle": data.get("wheel_angle", 0.0),
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
                        "car_left_right": data.get("car_left_right"),
                        "lf_speed": data.get("lf_speed"),
                        "rf_speed": data.get("rf_speed"),
                        "lr_speed": data.get("lr_speed"),
                        "rr_speed": data.get("rr_speed"),
                        "abs_active": data.get("abs_active"),
                        "tc_active": data.get("tc_active"),
                        "wheel_lock": data.get("wheel_lock"),
                        "clutch": data.get("clutch", 0.0),
                        "shift_indicator_pct": data.get("shift_indicator_pct", 0.0),
                        "fuel_level": data.get("fuel_level", 0.0),
                        "fuel_use_per_hour": data.get("fuel_use_per_hour", 0.0),
                        "fuel_level_pct": data.get("fuel_level_pct", 0.0),
                        "air_temp": data.get("air_temp", 0.0),
                        "track_temp": data.get("track_temp", 0.0),
                        "wind_vel": data.get("wind_vel", 0.0),
                        "wind_dir": data.get("wind_dir", 0.0),
                        "skies": data.get("skies", 0),
                        "on_pit_road": data.get("on_pit_road", False),
                        "pit_sv_flags": data.get("pit_sv_flags", 0),
                        "pit_sv_fuel": data.get("pit_sv_fuel", 0.0),
                        "session_flags": data.get("session_flags", 0),
                        "session_time_remain": data.get("session_time_remain", 0.0),
                        "session_laps_remain": data.get("session_laps_remain", 0),
                        "player_car_idx": data.get("player_car_idx"),
                        "grid": data.get("grid", {}),
                    }

                    if packet_count % 60 == 0:
                        live_data["session_drivers"] = getattr(reader, "session_drivers", [])
                        sys.stdout.write(".")
                        sys.stdout.flush()

                    ws.send(json.dumps(live_data))
                    packet_count += 1

        except KeyboardInterrupt:
            logger.info("Stopped by user")
            break
        except (ConnectionError, WebSocketException, TimeoutError) as e:
            logger.error(f"Connection lost: {e}. Reconnecting in 2s...")
            time.sleep(2)
