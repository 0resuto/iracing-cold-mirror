import math
import time

import irsdk

from telemetry.physics import calculate_wheel_physics


class IBTReader:
    def __init__(self, file_path="dev/telemetry.ibt", loop=True):
        self.ibt = irsdk.IBT()
        self.ibt.open(file_path)
        self.loop = loop

        # Calculate total samples
        session_time = self.ibt.get_all("SessionTime")
        self.num_samples = len(session_time) if session_time else 0
        print(f"IBTReader initialized. Total samples: {self.num_samples}")

        self.current_idx = 0
        self.names = self.ibt.var_headers_names

        # Parse Session Info (YAML)
        self.track_name = "Unknown Track"
        self.player_name = "Unknown Player"
        self.car_name = "Unknown Car"
        try:
            import yaml

            start = self.ibt._header.session_info_offset
            length = self.ibt._header.session_info_len
            yaml_str = (
                self.ibt._shared_mem[start : start + length]
                .rstrip(b"\x00")
                .decode("utf-8", errors="ignore")
            )
            session_info = yaml.safe_load(yaml_str)

            weekend_info = session_info.get("WeekendInfo", {})
            self.track_name = weekend_info.get("TrackName", "Unknown Track")
            self.track_id = weekend_info.get("TrackID", 165)

            driver_info = session_info.get("DriverInfo", {})
            drivers = driver_info.get("Drivers", [])
            for d in drivers:
                if d.get("CarIdx") == driver_info.get("DriverCarIdx"):
                    self.player_name = d.get("UserName", "Unknown Player")
                    self.car_name = (
                        d.get("CarScreenName")
                        or d.get("CarClassShortName")
                        or d.get("CarPath")
                        or "Unknown Car"
                    )
                    break

            split_info = session_info.get("SplitTimeInfo", {})
            self.sectors = split_info.get("Sectors", [])

        except Exception as e:
            print(f"Warning: Could not parse session info YAML: {e}")

    def read(self):
        if self.num_samples == 0:
            return None

        if self.current_idx >= self.num_samples:
            if not self.loop:
                return None
            else:
                self.current_idx = 0

        idx = self.current_idx
        data = {}

        # Helper to get variable safely
        def get_val(name, default=0.0):
            if name in self.names:
                val = self.ibt.get(idx, name)
                return val if val is not None else default
            return default

        speed_ms = get_val("Speed")
        data["speed"] = speed_ms * 3.6  # m/s to km/h
        data["rpm"] = get_val("RPM")
        data["gear"] = int(get_val("Gear", 0))
        data["throttle"] = get_val("Throttle")
        data["brake"] = get_val("Brake")
        data["wheel_angle"] = get_val("SteeringWheelAngle")

        data["session_time"] = get_val("LapCurrentLapTime")
        data["lap"] = int(get_val("Lap", 0))
        data["lap_dist_pct"] = get_val("LapDistPct")
        data["lat"] = get_val("Lat")
        data["lon"] = get_val("Lon")
        data["track_id"] = getattr(self, "track_id", 165)

        # Dynamics
        data["yaw"] = get_val("Yaw")
        data["yaw_rate"] = get_val("YawRate")
        data["vx"] = get_val("VelocityX")
        data["vy"] = get_val("VelocityY")
        data["vz"] = get_val("VelocityZ")

        # Slip angle approx
        data["slip_angle"] = 0.0
        if speed_ms > 2.0:
            data["slip_angle"] = math.degrees(math.atan2(data["vy"], data["vx"]))

        data["g_lat"] = get_val("LatAccel") / 9.81 if "LatAccel" in self.names else 0.0
        data["g_lon"] = get_val("LongAccel") / 9.81 if "LongAccel" in self.names else 0.0

        data["lf_speed"] = get_val("LFspeed") * 3.6 if "LFspeed" in self.names else data["speed"]
        data["rf_speed"] = get_val("RFspeed") * 3.6 if "RFspeed" in self.names else data["speed"]
        data["lr_speed"] = get_val("LRspeed") * 3.6 if "LRspeed" in self.names else data["speed"]
        data["rr_speed"] = get_val("RRspeed") * 3.6 if "RRspeed" in self.names else data["speed"]

        data = calculate_wheel_physics(data)

        self.current_idx += 1

        time.sleep(0.016)

        return data

    def set_lap_dist_pct(self, pct):
        # Ignore, we just replay sequentially
        pass

    def close(self):
        if hasattr(self.ibt, "close"):
            self.ibt.close()
