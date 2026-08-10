import math

import irsdk

from telemetry.physics import calculate_wheel_physics


def safe_int(val, default=0):
    try:
        if math.isnan(val):
            return default
        return int(val)
    except (ValueError, TypeError):
        return default


class IBTReader:
    def __init__(self, file_path="dev/telemetry.ibt"):
        self.ibt = irsdk.IBT()
        self.ibt.open(file_path)

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
            self.session_drivers = []
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
                    break

            # Inject fake drivers for UI testing of all license classes
            fake_licenses = [
                (1, "R 2.45", 0xFC0303, "Rookie Test", 0xFFFFFF),
                (2, "D 3.20", 0xFC7B03, "D-Class Test", 0x333333),
                (3, "C 1.99", 0xFCE303, "C-Class Test", 0x00FF00),
                (4, "B 4.15", 0x03FC3D, "B-Class Test", 0x0000FF),
                (5, "A 2.99", 0x0345FC, "A-Class Test", 0xFFFF00),
                (6, "P 3.50", 0x000000, "Pro Test", 0xFF00FF),
            ]

            start_idx = 100
            for i, (lvl, string, color, name, car_col) in enumerate(fake_licenses):
                self.session_drivers.append(
                    {
                        "CarIdx": start_idx + i,
                        "UserName": name,
                        "CarNumber": f"9{i}",
                        "CarClassID": 1,
                        "CarClassShortName": "TEST",
                        "CarScreenNameShort": f"Car {i + 1}",
                        "TeamName": "Test Team",
                        "IRating": 1500 + (i * 500),
                        "LicLevel": lvl,
                        "LicString": string,
                        "LicColor": color,
                        "CarClassColor": car_col,
                        "IsSpectator": 0,
                        "IsPaceCar": 0,
                    }
                )

            split_info = session_info.get("SplitTimeInfo", {})
            self.sectors = split_info.get("Sectors", [])

        except Exception as e:
            print(f"Warning: Could not parse session info YAML: {e}")

    def reset(self):
        self.current_idx = 0

    def read(self):
        if self.num_samples == 0:
            return None

        if self.current_idx >= self.num_samples:
            return None

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
        data["car_left_right"] = get_val("CarLeftRight", 0)

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

        raw_arrays = {var: get_val(var, []) for var in grid_vars}
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

        # IBT telemetry files often don't contain opponent telemetry unless explicitly enabled.
        # So we inject a fake static opponent if the grid is empty, for UI testing.
        if not active_cars and self.session_drivers:
            # Provide fake data for opponents and player
            # Let player move slowly so opponents can overtake them in tests
            mock_player_pct = (self.current_idx * 0.0002) % 1.0

            for drv in self.session_drivers:
                idx = drv["CarIdx"]
                if idx is not None and not drv.get("IsSpectator"):
                    is_player = drv.get("UserName") == self.player_name

                    if is_player:
                        active_cars[str(idx)] = {
                            "Lap": get_val("Lap", 1),
                            "LapDistPct": mock_player_pct,
                            "TrackSurface": 3,
                            "Position": idx,
                            "LastLapTime": 0,
                        }
                    else:
                        # Fake opponents moving slightly faster
                        opp_pct = (0.05 + idx * 0.137 + self.current_idx * 0.0003) % 1.0
                        active_cars[str(idx)] = {
                            "Lap": 1,
                            "LapDistPct": opp_pct,
                            "TrackSurface": 3,
                            "Position": idx,
                            "LastLapTime": 90.0 + (idx * 0.5),
                        }

                        # Mock CarLeftRight behavior based on proximity for UI testing
                        delta = opp_pct - mock_player_pct
                        if delta > 0.5:
                            delta -= 1.0
                        if delta < -0.5:
                            delta += 1.0

                        # If this fake opponent is right next to the player (within 0.005)
                        if abs(delta) < 0.005:
                            # Make them randomly left or right based on their index
                            data["car_left_right"] = 2 if idx % 2 == 0 else 3

        data["grid"] = active_cars

        data = calculate_wheel_physics(data)

        self.current_idx += 1

        return data

    def set_lap_dist_pct(self, pct):
        pass

    def close(self):
        if hasattr(self.ibt, "close"):
            self.ibt.close()
