from typing import Any, Dict, List

from telemetry.simulator.config import ClassConfig, DriverConfig
from telemetry.simulator.track import TrackModel


class VehicleAgent:
    """
    Simulates physical motion, fuel consumption, pit lane stops,
    and lap timing for a single car in the simulation.
    """

    def __init__(
        self,
        driver: DriverConfig,
        class_config: ClassConfig,
        track_model: TrackModel,
    ):
        self.driver = driver
        self.class_config = class_config
        self.track_model = track_model

        self.car_idx = driver.car_idx
        self.car_class = driver.car_class_short_name
        self.is_player = driver.is_player

        # Position and motion state
        self.lap_dist_pct = driver.initial_lap_dist_pct
        self.lap = 1
        self.speed_kmh = 0.0
        self.speed_mps = 0.0
        self.track_surface = 4  # 4 = OnTrack, 3 = AproachingPits, 2 = InPitStall, 1 = OffTrack
        self.on_pit_road = False
        self.has_damage = False
        self.is_punctured = False

        # Fuel model
        self.max_fuel = class_config.max_fuel_l
        self.fuel_level = class_config.max_fuel_l * 0.85
        self.fuel_burn_rate = class_config.fuel_burn_per_sec  # Liters per second at full speed

        # Lap timing
        self.lap_start_time = 0.0
        self.best_lap_time = class_config.base_lap_time_s * (1.0 / max(0.8, driver.speed_variance))
        self.last_lap_time = self.best_lap_time + 0.4
        self.lap_completion_times: List[Dict[str, Any]] = []

        # Pit stop state
        self.is_pitting = False
        self.pit_stall_dwell_remaining = 0.0
        self.pit_stop_count = 0
        self.scheduled_pit_lap = 8 if self.is_player else (6 + (self.car_idx % 4))

        # Spotter relative lateral placement
        self.side = "left" if self.car_idx % 2 == 0 else "right"

    def update(
        self,
        dt: float,
        session_time: float,
        global_flags: Dict[str, Any],
        grip_factor: float = 1.0,
    ) -> None:
        """Advances agent state by time delta dt."""
        if dt <= 0:
            return

        base_modifier = self.class_config.speed_modifier * self.driver.speed_variance * grip_factor
        speed_modifier = base_modifier

        # 1. Flag & Hazard Speed Limits
        if global_flags.get("is_safety_car_active", False):
            speed_modifier = min(speed_modifier, 0.45)  # SC pace ~100 km/h
        elif global_flags.get("incident_sector") == self.track_model.get_sector_id(
            self.lap_dist_pct
        ):
            speed_modifier *= 0.65  # Local yellow flag pace

        # 2. Damage & Puncture penalties
        if self.is_punctured:
            speed_modifier = min(speed_modifier, 0.25)
        elif self.has_damage:
            speed_modifier *= 0.70

        # 3. Check pit stop entry window
        if (
            self.lap >= self.scheduled_pit_lap
            and 0.90 < self.lap_dist_pct < 0.95
            and not self.is_pitting
        ):
            self.is_pitting = True

        # 4. Pit Lane navigation
        if self.is_pitting:
            pit_lane = self.track_model.config.pit_lane

            if (
                self.lap_dist_pct >= pit_lane.entry_pct
                and self.lap_dist_pct < pit_lane.pit_road_start_pct
            ):
                self.track_surface = 3  # ApproachingPits
                self.on_pit_road = True
            elif self.track_model.is_in_pit_road(self.lap_dist_pct):
                self.track_surface = 2  # InPitStall
                self.on_pit_road = True

                # Box Stop & Service
                if abs(self.lap_dist_pct - pit_lane.pit_stalls_center_pct) < 0.006:
                    if self.pit_stall_dwell_remaining > 0:
                        self.pit_stall_dwell_remaining -= dt
                        self.speed_kmh = 0.0
                        self.speed_mps = 0.0
                        return
                    elif self.pit_stall_dwell_remaining == 0:
                        self.pit_stall_dwell_remaining = 8.0 + (
                            0.0 if self.is_player else float(self.car_idx % 3)
                        )
                        self.pit_stop_count += 1
                        self.has_damage = False
                        self.is_punctured = False
                        self.fuel_level = self.max_fuel * 0.90  # Refuel
                        return

            # Pit speed limiter
            base_target = self.track_model.get_base_speed_kmh(self.lap_dist_pct, speed_modifier)
            self.speed_kmh = min(self.track_model.config.pit_lane.speed_limit_kmh, base_target)

            # Exit pit lane
            if (
                self.lap_dist_pct > pit_lane.exit_merge_pct
                and self.lap_dist_pct < 0.20
                and self.pit_stall_dwell_remaining <= 0
            ):
                self.is_pitting = False
                self.on_pit_road = False
                self.track_surface = 4  # OnTrack
                self.scheduled_pit_lap += 8
        else:
            self.track_surface = 4
            self.on_pit_road = False
            self.speed_kmh = self.track_model.get_base_speed_kmh(self.lap_dist_pct, speed_modifier)

        self.speed_mps = (self.speed_kmh * 1000.0) / 3600.0

        # 5. Advance track distance
        dist_step_m = self.speed_mps * dt
        delta_pct = dist_step_m / self.track_model.length_m
        next_pct = self.lap_dist_pct + delta_pct

        # 6. Lap completion check
        if next_pct >= 1.0:
            next_pct -= 1.0
            self.lap += 1

            lap_duration = session_time - self.lap_start_time
            self.lap_start_time = session_time

            if 40.0 < lap_duration < 300.0:
                self.last_lap_time = round(lap_duration, 3)
                if not self.best_lap_time or self.last_lap_time < self.best_lap_time:
                    self.best_lap_time = self.last_lap_time

            self.lap_completion_times.append(
                {
                    "lap": self.lap - 1,
                    "session_time": round(session_time, 2),
                    "lap_time": self.last_lap_time,
                }
            )

        self.lap_dist_pct = next_pct

        # 7. Consume fuel
        speed_factor = self.speed_kmh / 250.0
        fuel_used = self.fuel_burn_rate * speed_factor * dt
        self.fuel_level = max(0.0, self.fuel_level - fuel_used)

    def get_fuel_telemetry(self) -> Dict[str, float]:
        """Calculates fuel levels and hourly burn rate."""
        fuel_level_pct = max(0.0, min(1.0, self.fuel_level / max(1.0, self.max_fuel)))
        speed_factor = self.speed_kmh / 250.0
        fuel_use_per_hour = self.fuel_burn_rate * speed_factor * 3600.0

        return {
            "fuel_level": float(round(self.fuel_level, 2)),
            "fuel_level_pct": float(round(fuel_level_pct, 4)),
            "fuel_use_per_hour": float(round(fuel_use_per_hour, 2)),
        }

    def get_telemetry_frame(self) -> Dict[str, Any]:
        """Returns standard dictionary frame for this car."""
        return {
            "CarIdx": self.car_idx,
            "LapDistPct": float(round(self.lap_dist_pct, 5)),
            "Lap": self.lap,
            "TrackSurface": self.track_surface,
            "OnPitRoad": self.on_pit_road,
            "HasDamage": self.has_damage or self.is_punctured,
            "BestLapTime": self.best_lap_time,
            "LastLapTime": self.last_lap_time,
            "SpeedKph": float(round(self.speed_kmh, 1)),
            "side": self.side,
        }
