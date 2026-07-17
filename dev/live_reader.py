import logging
import math
import time

import irsdk


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
            for driver in driver_info.get("Drivers", []) or []:
                if driver.get("CarIdx") == driver_car_idx:
                    self.player_name = driver.get("UserName", "Unknown Player")
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
            "session_time": self._get_val("LapCurrentLapTime", self._get_val("SessionTime")),
            "lap": int(self._get_val("Lap", 0)),
            "lap_dist_pct": self._get_val("LapDistPct"),
            "lat": self._get_val("Lat", None),
            "lon": self._get_val("Lon", None),
            "track_id": self.track_id,
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

        data["slip_angle"] = math.degrees(math.atan2(velocity_y, velocity_x)) if speed_ms > 2.0 else 0.0

        if data["brake"] > 0.1 and data["speed"] > 20.0:
            min_wheel_speed = min(data["lf_speed"], data["rf_speed"], data["lr_speed"], data["rr_speed"])
            data["abs_active"] = 1 if (data["speed"] - min_wheel_speed) / data["speed"] > 0.15 else 0

        if data["throttle"] > 0.1 and data["speed"] > 10.0:
            max_wheel_speed = max(data["lf_speed"], data["rf_speed"], data["lr_speed"], data["rr_speed"])
            data["tc_active"] = 1 if (max_wheel_speed - data["speed"]) / data["speed"] > 0.15 else 0

        data["wheel_lock"] = 1 if data["brake"] > 0.5 and data["lf_speed"] < 5.0 and data["speed"] > 10.0 else 0

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
