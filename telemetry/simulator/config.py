from dataclasses import dataclass, field
from typing import Dict, List


@dataclass
class Waypoint:
    """Waypoint along the racing line with target dynamics and curvature."""

    pct: float
    speed_kmh: float
    turn_num: int = 0
    name: str = ""
    brake: float = 0.0
    steering: float = 0.0
    radius_m: float = 0.0


@dataclass
class SectorConfig:
    """Sector boundary definition."""

    id: int
    start_pct: float
    end_pct: float
    name: str


@dataclass
class PitLaneConfig:
    """Pit lane topology and parameters."""

    entry_pct: float
    pit_road_start_pct: float
    pit_stalls_center_pct: float
    pit_road_end_pct: float
    exit_merge_pct: float
    speed_limit_kmh: float = 60.0


@dataclass
class TrackConfig:
    """Track layout and geometry configuration."""

    name: str
    short_name: str
    track_id: int
    length_m: float
    sectors: List[SectorConfig]
    pit_lane: PitLaneConfig
    waypoints: List[Waypoint]


@dataclass
class ClassConfig:
    """Vehicle class characteristics and base performance."""

    class_id: int
    class_name: str
    color_hex: str
    color_int: int
    speed_modifier: float
    base_lap_time_s: float
    max_fuel_l: float = 120.0
    fuel_burn_per_sec: float = 0.85


@dataclass
class DriverConfig:
    """Configuration for an individual driver in the simulation fleet."""

    car_idx: int
    user_name: str
    car_number: str
    car_class_short_name: str
    car_screen_name: str
    car_screen_name_short: str
    irating: int = 3500
    safety_rating: float = 3.5
    lic_string: str = "A 3.5"
    lic_level: int = 4
    is_player: bool = False
    initial_lap_dist_pct: float = 0.0
    speed_variance: float = 1.0


@dataclass
class SimulationScenarioConfig:
    """Simulation run scenario parameters."""

    track_name: str = "spa"
    duration_seconds: int = 1800
    total_laps: int = 15
    target_fps: int = 60
    drivers: List[DriverConfig] = field(default_factory=list)
    classes: Dict[str, ClassConfig] = field(default_factory=dict)
