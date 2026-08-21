import logging
import sys
import time
from typing import Any, Dict, Optional

from telemetry.physics import calculate_wheel_physics
from telemetry.simulator.config import SimulationScenarioConfig
from telemetry.simulator.control.incident import IncidentManager
from telemetry.simulator.environment.weather import WeatherModel
from telemetry.simulator.track import SPA_TRACK_CONFIG, TrackModel
from telemetry.simulator.vehicle.fleet import (
    DEFAULT_CLASSES,
    DEFAULT_DRIVERS,
    MultiClassFleet,
)
from telemetry.simulator.vehicle.inputs import InputSynthesizer

# Ensure 1ms timer resolution on Windows to avoid time.sleep jitter
if sys.platform == "win32":
    try:
        import ctypes

        ctypes.windll.winmm.timeBeginPeriod(1)
    except Exception:
        pass

logger = logging.getLogger(__name__)


class SimulatorEngine:
    """
    Core telemetry simulation coordinator managing multi-class fleet physics,
    weather dynamics, hazard state machines, and real-time state mutations.
    """

    def __init__(self, scenario: Optional[SimulationScenarioConfig] = None):
        self.scenario = scenario or SimulationScenarioConfig()
        self.track_model = TrackModel(SPA_TRACK_CONFIG)

        drivers = self.scenario.drivers if self.scenario.drivers else DEFAULT_DRIVERS
        classes = self.scenario.classes if self.scenario.classes else DEFAULT_CLASSES

        self.fleet = MultiClassFleet(self.track_model, drivers=drivers, classes=classes)
        self.inputs = InputSynthesizer(self.track_model)
        self.weather = WeatherModel()
        self.incidents = IncidentManager()

        self.session_time = 0.0
        self.total_duration = float(self.scenario.duration_seconds)
        self.total_laps = self.scenario.total_laps
        self.target_fps = float(self.scenario.target_fps)
        self.target_dt = 1.0 / self.target_fps
        self.speed_multiplier = 1.0
        self.is_paused = False
        self.spotter_override = 0  # 0=Auto, 1=Clear, 2=Left, 3=Right, 4=3-Wide
        self.latest_frame: Optional[Dict[str, Any]] = None

        self.last_perf_counter = time.perf_counter()

    def start(self) -> None:
        """Initializes time tracking for engine steps."""
        self.last_perf_counter = time.perf_counter()

    def stop(self) -> None:
        """Stops engine activity."""
        pass

    # Direct in-memory control methods
    def trigger_yellow(self, sector: int = 2, duration_s: float = 25.0) -> None:
        self.incidents.trigger_incident(sector, duration_s)

    def clear_incidents(self) -> None:
        self.incidents.clear_incident()

    def toggle_safety_car(self, active: Optional[bool] = None) -> bool:
        return self.incidents.toggle_safety_car(active)

    def toggle_pause(self, paused: Optional[bool] = None) -> bool:
        self.is_paused = not self.is_paused if paused is None else paused
        return self.is_paused

    def set_speed(self, factor: float) -> None:
        self.speed_multiplier = max(0.1, min(50.0, factor))

    def set_weather(
        self,
        rain: Optional[float] = None,
        track_temp: Optional[float] = None,
        air_temp: Optional[float] = None,
        wind_vel: Optional[float] = None,
    ) -> None:
        self.weather.set_weather(air_temp=air_temp, track_temp=track_temp, rain=rain)
        if wind_vel is not None:
            self.weather.wind_vel = wind_vel

    def trigger_damage(
        self, car_idx: int = 9, puncture: bool = False, repair: bool = False
    ) -> None:
        for agent in self.fleet.agents:
            if agent.car_idx == car_idx:
                if repair:
                    agent.has_damage = False
                    agent.is_punctured = False
                else:
                    agent.has_damage = True
                    agent.is_punctured = puncture

    def force_pit_stop(self, car_idx: int = 9) -> None:
        for agent in self.fleet.agents:
            if agent.car_idx == car_idx:
                agent.is_pitting = True

    def refuel(
        self, car_idx: int = 9, refuel_full: bool = True, fuel_level: Optional[float] = None
    ) -> None:
        for agent in self.fleet.agents:
            if agent.car_idx == car_idx:
                if refuel_full:
                    agent.fuel_level = agent.max_fuel
                elif fuel_level is not None:
                    agent.fuel_level = max(0.0, min(agent.max_fuel, fuel_level))

    def set_spotter_override(self, mode: int = 0) -> None:
        self.spotter_override = mode

    def step(self, dt: Optional[float] = None) -> Dict[str, Any]:
        """
        Advances simulation physics by dt seconds (with adaptive clock compensation).
        Returns the synthesized telemetry data dictionary.
        """
        now = time.perf_counter()
        measured_dt = now - self.last_perf_counter
        self.last_perf_counter = now

        effective_dt = dt if dt is not None else min(0.1, max(0.001, measured_dt))
        effective_dt *= self.speed_multiplier

        if self.is_paused:
            effective_dt = 0.0

        self.session_time += effective_dt

        # 1. Update environment & incident state machines
        self.weather.update(effective_dt, self.session_time)
        self.incidents.update(effective_dt)
        grip_factor = self.weather.get_grip_factor()
        global_flags = self.incidents.get_global_flags()

        # 2. Advance multi-class vehicle fleet
        self.fleet.update(effective_dt, self.session_time, global_flags, grip_factor)

        # 3. Synthesize player controls & dynamics
        player = self.fleet.get_player()
        input_frame = self.inputs.update(
            player_speed_kmh=player.speed_kmh,
            player_lap_dist_pct=player.lap_dist_pct,
            dt=effective_dt,
            grip_factor=grip_factor,
        )

        # 4. Calculate wheel lock / ABS / TC physics using shared telemetry business logic
        input_frame = calculate_wheel_physics(input_frame)

        # 5. Assemble complete telemetry packet
        grid_data = self.fleet.get_grid_telemetry()
        fuel_data = player.get_fuel_telemetry()
        weather_data = self.weather.get_telemetry_frame()

        # Determine effective spotter value (override vs auto)
        effective_car_left_right = grid_data["car_left_right"]
        if self.spotter_override == 1:
            effective_car_left_right = 0
        elif self.spotter_override == 2:
            effective_car_left_right = 2
        elif self.spotter_override == 3:
            effective_car_left_right = 3
        elif self.spotter_override == 4:
            effective_car_left_right = 4

        time_remain = max(0.0, self.total_duration - self.session_time)
        laps_remain = max(0, self.total_laps - player.lap)

        frame = {
            # Identification
            "player_car_idx": player.car_idx,
            "track_id": self.track_model.config.track_id,
            "track_name": self.track_model.config.name,
            "player_name": player.driver.user_name,
            "car_name": player.driver.car_screen_name,
            # Position & Timing
            "lap_number": player.lap,
            "lap_dist_pct": float(round(player.lap_dist_pct, 5)),
            "session_time": float(round(self.session_time, 3)),
            "session_time_remain": float(round(time_remain, 1)),
            "session_laps_remain": laps_remain,
            "session_flags": global_flags["session_flags"],
            "session_best_lap_time": grid_data["session_best_lap_time"],
            # Vehicle Dynamics & Controls
            **input_frame,
            # Fuel
            **fuel_data,
            # Environment
            **weather_data,
            # Spotter & Pit
            "car_left_right": effective_car_left_right,
            "on_pit_road": player.on_pit_road,
            "pit_sv_flags": 0,
            "pit_sv_fuel": 0.0,
            # Grid Standings & Relative
            "grid": grid_data["grid"],
            # Static Metadata
            "sectors": self.track_model.get_sectors_list(),
            "session_drivers": self.fleet.get_session_drivers(),
        }
        self.latest_frame = frame
        return frame

    def get_status(self) -> Dict[str, Any]:
        """Returns in-memory snapshot of simulation state for UI rendering."""
        player = self.fleet.get_player()
        fuel_telemetry = player.get_fuel_telemetry()
        grid_data = self.fleet.get_grid_telemetry()

        effective_car_left_right = grid_data["car_left_right"]
        if self.spotter_override == 1:
            effective_car_left_right = 0
        elif self.spotter_override == 2:
            effective_car_left_right = 2
        elif self.spotter_override == 3:
            effective_car_left_right = 3
        elif self.spotter_override == 4:
            effective_car_left_right = 4

        return {
            "session_time": float(round(self.session_time, 2)),
            "session_time_remain": float(
                round(max(0.0, self.total_duration - self.session_time), 1)
            ),
            "lap": player.lap,
            "total_laps": self.total_laps,
            "speed_multiplier": self.speed_multiplier,
            "is_paused": self.is_paused,
            "safety_car": self.incidents.is_safety_car_active,
            "incident_sector": self.incidents.incident_sector,
            "incident_timer": float(round(self.incidents.incident_timer, 1)),
            "session_flags": self.incidents.get_session_flags(),
            "rain_intensity": float(round(self.weather.rain_intensity, 2)),
            "track_wetness": float(round(self.weather.track_wetness, 2)),
            "air_temp": float(round(self.weather.air_temp, 1)),
            "track_temp": float(round(self.weather.track_temp, 1)),
            "wind_vel": float(round(self.weather.wind_vel, 1)),
            "grip_factor": float(round(self.weather.get_grip_factor(), 2)),
            "player_speed_kmh": float(round(player.speed_kmh, 1)),
            "player_lap_dist_pct": float(round(player.lap_dist_pct, 4)),
            "player_fuel_level": fuel_telemetry["fuel_level"],
            "player_fuel_pct": fuel_telemetry["fuel_level_pct"],
            "player_has_damage": player.has_damage,
            "player_is_punctured": player.is_punctured,
            "player_on_pit_road": player.on_pit_road,
            "car_left_right": effective_car_left_right,
            "spotter_override": self.spotter_override,
            "leader_lap": grid_data["leader_lap"],
            "best_lap_time": float(round(player.best_lap_time, 3))
            if player.best_lap_time
            else 136.5,
            "last_lap_time": float(round(player.last_lap_time, 3))
            if player.last_lap_time
            else 136.5,
        }
