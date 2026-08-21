from typing import Any, Dict, List

from telemetry.simulator.config import ClassConfig, DriverConfig
from telemetry.simulator.track import TrackModel
from telemetry.simulator.vehicle.agent import VehicleAgent

DEFAULT_CLASSES: Dict[str, ClassConfig] = {
    "GTP": ClassConfig(
        class_id=1,
        class_name="GTP",
        color_hex="#ff3b30",
        color_int=0xFF3B30,
        speed_modifier=1.15,
        base_lap_time_s=120.5,
        max_fuel_l=110.0,
        fuel_burn_per_sec=0.95,
    ),
    "LMP2": ClassConfig(
        class_id=2,
        class_name="LMP2",
        color_hex="#007aff",
        color_int=0x007AFF,
        speed_modifier=1.08,
        base_lap_time_s=125.0,
        max_fuel_l=100.0,
        fuel_burn_per_sec=0.85,
    ),
    "GT3": ClassConfig(
        class_id=3,
        class_name="GT3",
        color_hex="#34c759",
        color_int=0x34C759,
        speed_modifier=1.00,
        base_lap_time_s=136.5,
        max_fuel_l=120.0,
        fuel_burn_per_sec=0.75,
    ),
    "GT4": ClassConfig(
        class_id=4,
        class_name="GT4",
        color_hex="#ff9500",
        color_int=0xFF9500,
        speed_modifier=0.91,
        base_lap_time_s=148.0,
        max_fuel_l=100.0,
        fuel_burn_per_sec=0.65,
    ),
}

DEFAULT_DRIVERS: List[DriverConfig] = [
    # GTP Class
    DriverConfig(
        1,
        "Max Verstappen",
        "1",
        "GTP",
        "Cadillac V-Series.R GTP",
        "Cadillac GTP",
        7800,
        4.9,
        "A 4.9",
        4,
        False,
        0.035,
        1.015,
    ),
    DriverConfig(
        2,
        "Lewis Hamilton",
        "44",
        "GTP",
        "Porsche 963 GTP",
        "Porsche 963",
        7200,
        4.8,
        "A 4.8",
        4,
        False,
        0.030,
        1.010,
    ),
    DriverConfig(
        3,
        "Charles Leclerc",
        "16",
        "GTP",
        "Ferrari 499P GTP",
        "Ferrari 499P",
        6900,
        4.7,
        "A 4.7",
        4,
        False,
        0.025,
        1.005,
    ),
    DriverConfig(
        4,
        "Lando Norris",
        "4",
        "GTP",
        "Acura ARX-06 GTP",
        "Acura ARX-06",
        6700,
        4.6,
        "A 4.6",
        4,
        False,
        0.020,
        1.000,
    ),
    # LMP2 Class
    DriverConfig(
        5,
        "Fernando Alonso",
        "14",
        "LMP2",
        "Dallara P217 LMP2",
        "Dallara P217",
        6400,
        4.5,
        "A 4.5",
        4,
        False,
        0.015,
        1.012,
    ),
    DriverConfig(
        6,
        "George Russell",
        "63",
        "LMP2",
        "Dallara P217 LMP2",
        "Dallara P217",
        6100,
        4.4,
        "A 4.4",
        4,
        False,
        0.010,
        1.008,
    ),
    DriverConfig(
        7,
        "Carlos Sainz",
        "55",
        "LMP2",
        "Dallara P217 LMP2",
        "Dallara P217",
        5900,
        4.3,
        "A 4.3",
        4,
        False,
        0.005,
        1.002,
    ),
    DriverConfig(
        8,
        "Oscar Piastri",
        "81",
        "LMP2",
        "Dallara P217 LMP2",
        "Dallara P217",
        5700,
        4.2,
        "A 4.2",
        4,
        False,
        0.000,
        0.998,
    ),
    # GT3 Class (Player is CarIdx 9)
    DriverConfig(
        9,
        "Simulated Driver",
        "992",
        "GT3",
        "Porsche 911 GT3 R (992)",
        "Porsche 992 GT3",
        4500,
        3.8,
        "A 3.8",
        4,
        True,
        0.500,
        1.000,
    ),
    DriverConfig(
        10,
        "Kevin Estre",
        "92",
        "GT3",
        "Porsche 911 GT3 R (992)",
        "Porsche 992 GT3",
        5800,
        4.6,
        "A 4.6",
        4,
        False,
        0.5036,
        1.008,
    ),
    DriverConfig(
        11,
        "Raffaele Marciello",
        "88",
        "GT3",
        "BMW M4 GT3",
        "BMW M4 GT3",
        5600,
        4.5,
        "A 4.5",
        4,
        False,
        0.4970,
        1.004,
    ),
    DriverConfig(
        12,
        "Dries Vanthoor",
        "32",
        "GT3",
        "BMW M4 GT3",
        "BMW M4 GT3",
        5400,
        4.4,
        "A 4.4",
        4,
        False,
        0.4850,
        0.996,
    ),
    # GT4 Class
    DriverConfig(
        13,
        "Daniel Juncadella",
        "21",
        "GT4",
        "Aston Martin Vantage GT4",
        "Aston GT4",
        4200,
        3.9,
        "B 3.9",
        3,
        False,
        0.350,
        1.005,
    ),
    DriverConfig(
        14,
        "Maro Engel",
        "64",
        "GT4",
        "Mercedes-AMG GT4",
        "Mercedes GT4",
        4000,
        3.8,
        "B 3.8",
        3,
        False,
        0.340,
        1.000,
    ),
    DriverConfig(
        15,
        "Nick Catsburg",
        "33",
        "GT4",
        "BMW M4 GT4",
        "BMW GT4",
        3900,
        3.7,
        "B 3.7",
        3,
        False,
        0.330,
        0.995,
    ),
    DriverConfig(
        16,
        "Jules Gounon",
        "77",
        "GT4",
        "Porsche 718 Cayman GT4",
        "Porsche GT4",
        3800,
        3.6,
        "B 3.6",
        3,
        False,
        0.320,
        0.990,
    ),
]


class MultiClassFleet:
    """
    Manages multi-class AI grid, spatial relationships, relative deltas (F2Time),
    classification standings, and spotter warnings.
    """

    def __init__(
        self,
        track_model: TrackModel,
        drivers: List[DriverConfig] = DEFAULT_DRIVERS,
        classes: Dict[str, ClassConfig] = DEFAULT_CLASSES,
    ):
        self.track_model = track_model
        self.classes = classes
        self.drivers = drivers

        self.agents: List[VehicleAgent] = []
        for d in drivers:
            cls_cfg = classes.get(
                d.car_class_short_name, classes.get("GT3", DEFAULT_CLASSES["GT3"])
            )
            self.agents.append(VehicleAgent(d, cls_cfg, track_model))

        self.player_agent = next((a for a in self.agents if a.is_player), self.agents[0])

    def update(
        self,
        dt: float,
        session_time: float,
        global_flags: Dict[str, Any],
        grip_factor: float = 1.0,
    ) -> None:
        """Updates physics for all vehicle agents."""
        for agent in self.agents:
            agent.update(dt, session_time, global_flags, grip_factor)

    def get_player(self) -> VehicleAgent:
        return self.player_agent

    def get_leader(self) -> VehicleAgent:
        leader = self.agents[0]
        max_prog = -1.0
        for agent in self.agents:
            prog = float(agent.lap) + agent.lap_dist_pct
            if prog > max_prog:
                max_prog = prog
                leader = agent
        return leader

    def get_session_drivers(self) -> List[Dict[str, Any]]:
        """Returns session drivers metadata matching iRacing schema."""
        drivers_list = []
        for agent in self.agents:
            d = agent.driver
            cls_cfg = agent.class_config
            drivers_list.append(
                {
                    "CarIdx": d.car_idx,
                    "UserName": d.user_name,
                    "CarNumber": d.car_number,
                    "CarClassID": cls_cfg.class_id,
                    "CarClassShortName": d.car_class_short_name,
                    "CarClassColor": cls_cfg.color_int,
                    "CarScreenName": d.car_screen_name,
                    "CarScreenNameShort": d.car_screen_name_short,
                    "IRating": d.irating,
                    "LicLevel": d.lic_level,
                    "LicString": d.lic_string,
                    "IsPlayer": d.is_player,
                }
            )
        return drivers_list

    def get_grid_telemetry(self) -> Dict[str, Any]:
        """Calculates Standings, Class Positions, F2Time Relative, and Spotter."""
        # 1. Sort all cars by total race progress (Overall Standings)
        sorted_agents = sorted(
            self.agents,
            key=lambda a: float(a.lap) + a.lap_dist_pct,
            reverse=True,
        )

        # 2. Assign overall and class positions
        class_counters = {"GTP": 1, "LMP2": 1, "GT3": 1, "GT4": 1}
        position_map: Dict[int, int] = {}
        class_pos_map: Dict[int, int] = {}

        for index, agent in enumerate(sorted_agents):
            position_map[agent.car_idx] = index + 1
            c_pos = class_counters.get(agent.car_class, 1)
            class_pos_map[agent.car_idx] = c_pos
            class_counters[agent.car_class] = c_pos + 1

        # 3. Overall fastest lap
        fastest_lap_time = 9999.0
        fastest_car_idx = None
        for agent in self.agents:
            if agent.best_lap_time and agent.best_lap_time < fastest_lap_time:
                fastest_lap_time = agent.best_lap_time
                fastest_car_idx = agent.car_idx

        # 4. Relative gaps and spotter
        player_lap_dist = self.player_agent.lap_dist_pct
        trk_len = self.track_model.length_m

        has_left_spotter = False
        has_right_spotter = False
        grid: Dict[str, Any] = {}

        for agent in self.agents:
            frame = agent.get_telemetry_frame()
            pos = position_map.get(agent.car_idx, 1)
            class_pos = class_pos_map.get(agent.car_idx, 1)

            # Spatial delta relative to player on track
            delta_pct = agent.lap_dist_pct - player_lap_dist
            if delta_pct > 0.5:
                delta_pct -= 1.0
            if delta_pct < -0.5:
                delta_pct += 1.0
            distance_meters = delta_pct * trk_len

            # Approximate time gap (assuming reference speed 60 m/s)
            f2_time = float(round(distance_meters / 60.0, 1))

            # Spotter radar check (within +- 5.5 meters alongside player)
            if (
                not agent.is_player
                and abs(distance_meters) <= 5.5
                and agent.track_surface > 0
                and self.player_agent.track_surface > 0
            ):
                if agent.side == "left":
                    has_left_spotter = True
                if agent.side == "right":
                    has_right_spotter = True

            grid[str(agent.car_idx)] = {
                **frame,
                "Position": pos,
                "ClassPosition": class_pos,
                "F2Time": f2_time,
                "IsFastestLap": agent.car_idx == fastest_car_idx,
            }

        # Spotter bitmask: 0: Clear, 2: CarLeft, 3: CarRight, 4: 3-Wide (CarLeftRight)
        car_left_right = 0
        if has_left_spotter and has_right_spotter:
            car_left_right = 4
        elif has_left_spotter:
            car_left_right = 2
        elif has_right_spotter:
            car_left_right = 3

        return {
            "grid": grid,
            "car_left_right": car_left_right,
            "leader_lap": self.get_leader().lap,
            "session_best_lap_time": fastest_lap_time if fastest_lap_time < 9000 else 136.5,
        }
