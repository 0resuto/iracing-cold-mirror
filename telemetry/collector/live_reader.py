import logging
import math
import time

import irsdk

from telemetry.physics import calculate_wheel_physics

logger = logging.getLogger(__name__)


class IRacingLiveReader:
    def __init__(self, reconnect_interval=2.0):
        self.reconnect_interval = reconnect_interval
        self.ir = irsdk.IRSDK()
        self.names = []
        self.track_name = "Unknown Track"
        self.player_name = "Unknown Player"
        self.track_id = 165
        self.sectors = []
        self._last_session_tick = None

        self._connect_blocking()
        self._refresh_session_metadata()

    def _connect_blocking(self):
        while True:
            try:
                if self.ir.startup() and self.ir.is_connected:
                    self.names = self.ir.var_headers_names
                    logger.info("Connected to iRacing live telemetry")
                    return
            except Exception as exc:
                logger.warning("Could not connect to iRacing telemetry: %s", exc)

            logger.info("Waiting for iRacing telemetry...")
            self.ir.shutdown()
            time.sleep(self.reconnect_interval)

    def _ensure_connected(self):
        if self.ir.is_initialized and self.ir.is_connected:
            return

        logger.warning("iRacing telemetry disconnected. Reconnecting...")
        self.ir.shutdown()
        self._connect_blocking()
        self._refresh_session_metadata()
        self._last_session_tick = None

    def _refresh_session_metadata(self):
        try:
            weekend_info = self.ir["WeekendInfo"] or {}
            driver_info = self.ir["DriverInfo"] or {}
            split_info = self.ir["SplitTimeInfo"] or {}

            self.track_name = weekend_info.get("TrackName", "Unknown Track")
            self.track_id = weekend_info.get("TrackID", self.track_id)
            self.sectors = split_info.get("Sectors", []) or []

            driver_car_idx = driver_info.get("DriverCarIdx")

            self.session_drivers = []
            for driver in driver_info.get("Drivers", []) or []:
                self.session_drivers.append(
                    {
                        "CarIdx": driver.get("CarIdx"),
                        "UserName": driver.get("UserName"),
                        "CarNumber": driver.get("CarNumber"),
                        "CarClassID": driver.get("CarClassID"),
                        "CarScreenName": driver.get("CarScreenName"),
                        "CarScreenNameShort": driver.get("CarScreenNameShort"),
                        "TeamName": driver.get("TeamName"),
                        "IRating": driver.get("IRating"),
                        "LicLevel": driver.get("LicLevel"),
                        "LicSubLevel": driver.get("LicSubLevel"),
                        "LicString": driver.get("LicString"),
                        "LicColor": driver.get("LicColor"),
                        "StartingPosition": driver.get("StartingPosition"),
                        "IsSpectator": driver.get("IsSpectator"),
                        "IsPaceCar": driver.get("CarIsPaceCar", driver.get("IsPaceCar")),
                        "CarPath": driver.get("CarPath"),
                        "CarID": driver.get("CarID"),
                        "CarClassRelSpeed": driver.get("CarClassRelSpeed"),
                        "CarClassEstLapTime": driver.get("CarClassEstLapTime"),
                        "CarClassMaxFuelPct": driver.get("CarClassMaxFuelPct"),
                        "CarClassWeightPenalty": driver.get("CarClassWeightPenalty"),
                        "CarClassPowerAdjust": driver.get("CarClassPowerAdjust"),
                        "CarClassDryTireSetLimit": driver.get("CarClassDryTireSetLimit"),
                        "CarClassColor": driver.get("CarClassColor"),
                    }
                )

                if driver.get("CarIdx") == driver_car_idx:
                    self.player_name = driver.get("UserName", "Unknown Player")
                    self.car_name = (
                        driver.get("CarScreenName")
                        or driver.get("CarClassShortName")
                        or "Unknown Car"
                    )
                    break
        except Exception as exc:
            logger.warning("Could not read iRacing session metadata: %s", exc)

    def _get_val(self, name, default=0.0):
        if name not in self.names:
            return default

        try:
            value = self.ir[name]
        except Exception:
            return default

        return default if value is None else value

    def _read_snapshot(self):
        speed_ms = self._get_val("Speed")
        velocity_x = self._get_val("VelocityX")
        velocity_y = self._get_val("VelocityY")

        speed_kmh = speed_ms * 3.6

        data = {
            "speed": speed_kmh,
            "rpm": self._get_val("RPM"),
            "gear": int(self._get_val("Gear", 0)),
            "throttle": self._get_val("Throttle"),
            "brake": self._get_val("Brake"),
            "wheel_angle": self._get_val("SteeringWheelAngle"),
            "track_id": getattr(self, "track_id", None),
            "session_time": self._get_val("SessionTime"),
            "lap": int(self._get_val("Lap", 0)),
            "lap_dist_pct": self._get_val("LapDistPct"),
            "lat": self._get_val("Lat", None),
            "lon": self._get_val("Lon", None),
            "yaw": self._get_val("Yaw"),
            "yaw_rate": self._get_val("YawRate"),
            "vx": velocity_x,
            "vy": velocity_y,
            "vz": self._get_val("VelocityZ"),
            "g_lat": self._get_val("LatAccel") / 9.81 if "LatAccel" in self.names else 0.0,
            "g_lon": self._get_val("LongAccel") / 9.81 if "LongAccel" in self.names else 0.0,
            "lf_speed": self._get_val("LFspeed", speed_ms) * 3.6,
            "rf_speed": self._get_val("RFspeed", speed_ms) * 3.6,
            "lr_speed": self._get_val("LRspeed", speed_ms) * 3.6,
            "rr_speed": self._get_val("RRspeed", speed_ms) * 3.6,
            "abs_active": 0,
            "tc_active": 0,
        }

        data["slip_angle"] = (
            math.degrees(math.atan2(velocity_y, velocity_x)) if speed_ms > 2.0 else 0.0
        )

        data["car_left_right"] = self._get_val("CarLeftRight", 0)

        data = calculate_wheel_physics(data)

        grid_vars = [
            "CarIdxLap",
            "CarIdxLapCompleted",
            "CarIdxLapDistPct",
            "CarIdxTrackSurface",
            "CarIdxOnPitRoad",
            "CarIdxPosition",
            "CarIdxClassPosition",
            "CarIdxGate",
            "CarIdxSessionFlags",
            "CarIdxF2Time",
            "CarIdxEstTime",
            "CarIdxLastLapTime",
            "CarIdxBestLapTime",
            "CarIdxSteer",
            "CarIdxRPM",
            "CarIdxGear",
            "CarIdxTireCompound",
            "CarIdxQualTireCompound",
            "CarIdxPaceLine",
            "CarIdxPaceRow",
            "CarIdxPaceFlags",
        ]

        raw_arrays = {var: self._get_val(var, []) for var in grid_vars}
        surface_arr = raw_arrays["CarIdxTrackSurface"]
        active_cars = {}
        if isinstance(surface_arr, (list, tuple)):
            for i in range(len(surface_arr)):
                if surface_arr[i] > -1:
                    car_data = {}
                    for var in grid_vars:
                        key = var.replace("CarIdx", "")
                        arr = raw_arrays[var]
                        car_data[key] = (
                            arr[i] if isinstance(arr, (list, tuple)) and len(arr) > i else None
                        )

                    active_cars[str(i)] = car_data
        data["grid"] = active_cars

        return data

    def read(self):
        while True:
            self._ensure_connected()

            try:
                self.ir.freeze_var_buffer_latest()
                session_tick = self._get_val("SessionTick", None)

                if session_tick is not None and session_tick == self._last_session_tick:
                    self.ir.unfreeze_var_buffer_latest()
                    time.sleep(0.005)
                    continue

                self._last_session_tick = session_tick
                data = self._read_snapshot()
                self.ir.unfreeze_var_buffer_latest()
                return data
            except Exception as exc:
                logger.warning("Failed to read iRacing telemetry: %s", exc)
                try:
                    self.ir.unfreeze_var_buffer_latest()
                except Exception:
                    pass
                self.ir.shutdown()
                time.sleep(self.reconnect_interval)

    def set_lap_dist_pct(self, pct):
        pass
