import json
import logging
import time

from telemetry.redis import redis_client

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


def run(reader):
    """
    Continuously reads live telemetry from the reader and streams it to Redis.

    Tracks the current lap and sector progress based on the car's lap distance
    percentage, formats the telemetry snapshot, and publishes it to the
    'telemetry:latest' Redis key at approximately 60Hz.
    """

    lap = 1
    lap_current_lap_time = 0
    last_lap_dist_pct = 0.0
    sectors = getattr(reader, "sectors", [])
    current_sector_id = 0

    try:
        while True:
            try:
                data = reader.read()
                if data is None:
                    break

                lap_current_lap_time = data.get("session_time", 0.0)

                if last_lap_dist_pct > 0.8 and data["lap_dist_pct"] < 0.2:
                    current_sector_id = 0
                    lap += 1

                next_sector_id = current_sector_id + 1

                if len(sectors) > 1 and next_sector_id < len(sectors):
                    next_sector_start_time = sectors[next_sector_id]["SectorStartPct"]
                    if data["lap_dist_pct"] >= next_sector_start_time:
                        current_sector_id = next_sector_id

                last_lap_dist_pct = data["lap_dist_pct"]

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

                time.sleep(0.016)

            except Exception as e:
                logger.error(f"Unexpected error in collector iteration: {e}")
                continue

    except KeyboardInterrupt:
        logger.info("Stopped by user")
    finally:
        logger.info("Exiting...")
