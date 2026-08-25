import logging
import math

import irsdk

from telemetry.physics import calculate_wheel_physics

logger = logging.getLogger(__name__)


def safe_int(val, default=0):
    try:
        if math.isnan(val):
            return default
        return int(val)
    except (ValueError, TypeError):
        return default


class IBTReader:
    def __init__(self, file_path: str):
        self.ibt = irsdk.IBT()
        self.ibt.open(file_path)
        if not getattr(self.ibt, "_header", None):
            raise ValueError(
                f"Failed to parse '{file_path}': not a valid iRacing IBT telemetry file"
            )

        session_time = self.ibt.get_all("SessionTime")
        self.num_samples = len(session_time) if session_time else 0
        logger.info(
            "IBTReader initialized for '%s'. Total samples: %d", file_path, self.num_samples
        )

        self.current_idx = 0
        self.names = self.ibt.var_headers_names

        self.track_name = "Unknown Track"
        self.player_name = "Unknown Player"
        self.car_name = "Unknown Car"
        self.track_id = 165
        self.redline_rpm = 8500
        self.session_drivers = []
        self.sectors = []

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
            self.redline_rpm = int(driver_info.get("DriverCarRedLine", 8500))
            drivers = driver_info.get("Drivers", [])
            for d in drivers:
                self.session_drivers.append(
                    {
                        "CarIdx": d.get("CarIdx"),
                        "UserName": d.get("UserName"),
                        "CarNumber": d.get("CarNumber"),
                        "CarClassID": d.get("CarClassID"),
                        "CarClassShortName": d.get("CarClassShortName"),
                        "TeamName": d.get("TeamName"),
                        "IRating": d.get("IRating"),
                        "LicLevel": d.get("LicLevel"),
                        "LicSubLevel": d.get("LicSubLevel"),
                        "LicString": d.get("LicString"),
                        "LicColor": d.get("LicColor"),
                        "StartingPosition": d.get("StartingPosition"),
                        "IsSpectator": d.get("IsSpectator"),
                        "IsPaceCar": d.get("CarIsPaceCar", d.get("IsPaceCar")),
                        "CarPath": d.get("CarPath"),
                        "CarID": d.get("CarID"),
                        "CarClassRelSpeed": d.get("CarClassRelSpeed"),
                        "CarClassEstLapTime": d.get("CarClassEstLapTime"),
                        "CarClassMaxFuelPct": d.get("CarClassMaxFuelPct"),
                        "CarClassWeightPenalty": d.get("CarClassWeightPenalty"),
                        "CarClassPowerAdjust": d.get("CarClassPowerAdjust"),
                        "CarClassDryTireSetLimit": d.get("CarClassDryTireSetLimit"),
                        "CarClassColor": d.get("CarClassColor"),
                    }
                )
                if d.get("CarIdx") == driver_info.get("DriverCarIdx"):
                    self.player_name = d.get("UserName", "Unknown Player")
                    self.car_name = (
                        d.get("CarScreenName")
                        or d.get("CarClassShortName")
                        or d.get("CarPath")
                        or "Unknown Car"
                    )

            split_info = session_info.get("SplitTimeInfo", {})
            self.sectors = split_info.get("Sectors", [])

        except Exception as e:
            logger.warning("Could not parse session info YAML in IBT file: %s", e)

    def read(self):
        if self.num_samples == 0 or self.current_idx >= self.num_samples:
            return None

        idx = self.current_idx
        data = {}

        def get_val(name, default=0.0):
            if name in self.names:
                val = self.ibt.get(idx, name)
                return val if val is not None else default
            return default

        speed_ms = get_val("Speed")
        data["speed"] = speed_ms * 3.6  # m/s to km/h
        data["rpm"] = get_val("RPM")
        data["gear"] = safe_int(get_val("Gear", 0))
        data["throttle"] = get_val("Throttle")
        data["brake"] = get_val("Brake")
        data["wheel_angle"] = get_val("SteeringWheelAngle")

        data["session_time"] = get_val("SessionTime")
        data["lap"] = safe_int(get_val("Lap", 0))
        data["lap_dist_pct"] = get_val("LapDistPct")
        data["lat"] = get_val("Lat")
        data["lon"] = get_val("Lon")
        data["track_id"] = getattr(self, "track_id", 165)

        data["yaw"] = get_val("Yaw")
        data["yaw_rate"] = get_val("YawRate")
        data["vx"] = get_val("VelocityX")
        data["vy"] = get_val("VelocityY")
        data["vz"] = get_val("VelocityZ")

        data["slip_angle"] = 0.0
        if speed_ms > 2.0:
            data["slip_angle"] = math.degrees(math.atan2(data["vy"], data["vx"]))

        data["g_lat"] = get_val("LatAccel") / 9.81 if "LatAccel" in self.names else 0.0
        data["g_lon"] = get_val("LongAccel") / 9.81 if "LongAccel" in self.names else 0.0

        data["lf_speed"] = get_val("LFspeed") * 3.6 if "LFspeed" in self.names else data["speed"]
        data["rf_speed"] = get_val("RFspeed") * 3.6 if "RFspeed" in self.names else data["speed"]
        data["lr_speed"] = get_val("LRspeed") * 3.6 if "LRspeed" in self.names else data["speed"]
        data["rr_speed"] = get_val("RRspeed") * 3.6 if "RRspeed" in self.names else data["speed"]
        data["car_left_right"] = get_val("CarLeftRight", 0)

        data = calculate_wheel_physics(data)
        self.current_idx += 1
        return data

    def close(self):
        if hasattr(self.ibt, "close"):
            self.ibt.close()
