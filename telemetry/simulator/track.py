from typing import List, Tuple

from telemetry.simulator.config import (
    PitLaneConfig,
    SectorConfig,
    TrackConfig,
    Waypoint,
)

SPA_TRACK_CONFIG = TrackConfig(
    name="Circuit de Spa-Francorchamps",
    short_name="Spa",
    track_id=165,
    length_m=7004.0,
    sectors=[
        SectorConfig(id=1, start_pct=0.0, end_pct=0.31, name="Sector 1 (La Source -> Kemmel)"),
        SectorConfig(id=2, start_pct=0.31, end_pct=0.77, name="Sector 2 (Les Combes -> Stavelot)"),
        SectorConfig(id=3, start_pct=0.77, end_pct=1.0, name="Sector 3 (Blanchimont -> Bus Stop)"),
    ],
    pit_lane=PitLaneConfig(
        entry_pct=0.95,
        pit_road_start_pct=0.965,
        pit_stalls_center_pct=0.985,
        pit_road_end_pct=0.065,
        exit_merge_pct=0.08,
        speed_limit_kmh=60.0,
    ),
    waypoints=[
        Waypoint(pct=0.00, speed_kmh=220.0, turn_num=0, name="Start/Finish Straight"),
        Waypoint(
            pct=0.04,
            speed_kmh=75.0,
            turn_num=1,
            name="Turn 1 - La Source",
            brake=0.95,
            steering=0.7,
            radius_m=25.0,
        ),
        Waypoint(pct=0.08, speed_kmh=160.0, turn_num=0, name="Downhill to Eau Rouge"),
        Waypoint(
            pct=0.12,
            speed_kmh=245.0,
            turn_num=2,
            name="Turn 2-4 - Eau Rouge / Raidillon",
            brake=0.0,
            steering=-0.3,
            radius_m=120.0,
        ),
        Waypoint(
            pct=0.22, speed_kmh=275.0, turn_num=0, name="Kemmel Straight", brake=0.0, steering=0.0
        ),
        Waypoint(
            pct=0.31,
            speed_kmh=125.0,
            turn_num=5,
            name="Turn 5-6 - Les Combes",
            brake=0.85,
            steering=0.6,
            radius_m=45.0,
        ),
        Waypoint(
            pct=0.37,
            speed_kmh=155.0,
            turn_num=7,
            name="Turn 7 - Malmedy",
            brake=0.3,
            steering=-0.4,
            radius_m=60.0,
        ),
        Waypoint(
            pct=0.44,
            speed_kmh=105.0,
            turn_num=8,
            name="Turn 8 - Bruxelles",
            brake=0.75,
            steering=0.65,
            radius_m=35.0,
        ),
        Waypoint(
            pct=0.49,
            speed_kmh=140.0,
            turn_num=9,
            name="Turn 9 - Speaker Corner",
            brake=0.4,
            steering=-0.5,
            radius_m=55.0,
        ),
        Waypoint(
            pct=0.58,
            speed_kmh=195.0,
            turn_num=10,
            name="Turn 10-11 - Double Gauche / Pouhon",
            brake=0.25,
            steering=-0.6,
            radius_m=90.0,
        ),
        Waypoint(
            pct=0.66,
            speed_kmh=135.0,
            turn_num=12,
            name="Turn 12-13 - Fagnes",
            brake=0.7,
            steering=0.5,
            radius_m=50.0,
        ),
        Waypoint(
            pct=0.73,
            speed_kmh=180.0,
            turn_num=14,
            name="Turn 14-15 - Stavelot",
            brake=0.2,
            steering=0.4,
            radius_m=80.0,
        ),
        Waypoint(
            pct=0.84,
            speed_kmh=270.0,
            turn_num=16,
            name="Turn 16-17 - Blanchimont",
            brake=0.0,
            steering=-0.25,
            radius_m=160.0,
        ),
        Waypoint(
            pct=0.94,
            speed_kmh=70.0,
            turn_num=18,
            name="Turn 18-19 - Bus Stop Chicane",
            brake=0.95,
            steering=0.75,
            radius_m=20.0,
        ),
        Waypoint(pct=0.98, speed_kmh=150.0, turn_num=0, name="Main Straight Acceleration"),
    ],
)


class TrackModel:
    """Track geometry model for waypoint interpolation, sectors, and pit lane tracking."""

    def __init__(self, config: TrackConfig = SPA_TRACK_CONFIG):
        self.config = config
        self.length_m = config.length_m
        self.waypoints: List[Waypoint] = sorted(config.waypoints, key=lambda w: w.pct)

    def get_sector_id(self, lap_dist_pct: float) -> int:
        """Returns sector ID (1, 2, or 3) for a given track position percentage."""
        pct = lap_dist_pct % 1.0
        for sector in self.config.sectors:
            if sector.start_pct <= pct < sector.end_pct:
                return sector.id
        return 3

    def get_sectors_list(self) -> List[dict]:
        """Returns list of sector dictionaries matching iRacing reader schema."""
        return [{"SectorNum": s.id - 1, "SectorStartPct": s.start_pct} for s in self.config.sectors]

    def is_approaching_pits(self, lap_dist_pct: float) -> bool:
        """Checks if vehicle is in the pit entry approach area."""
        pct = lap_dist_pct % 1.0
        entry = self.config.pit_lane.entry_pct
        pit_start = self.config.pit_lane.pit_road_start_pct
        return entry <= pct < pit_start

    def is_in_pit_road(self, lap_dist_pct: float) -> bool:
        """Checks if vehicle is inside pit road speed limiter zone."""
        pct = lap_dist_pct % 1.0
        start = self.config.pit_lane.pit_road_start_pct
        end = self.config.pit_lane.exit_merge_pct
        if start > end:
            return pct >= start or pct <= end
        return start <= pct <= end

    def get_base_speed_kmh(self, lap_dist_pct: float, speed_modifier: float = 1.0) -> float:
        """Returns base cornering/straight speed at track position adjusted by modifier."""
        target_speed, _, _ = self.get_target_dynamics(lap_dist_pct)
        return target_speed * speed_modifier

    def get_target_dynamics(self, lap_dist_pct: float) -> Tuple[float, float, float]:
        """
        Interpolates target speed (km/h), brake input (0..1), and steering angle factor (-1..1).
        """
        pct = lap_dist_pct % 1.0
        if not self.waypoints:
            return 150.0, 0.0, 0.0

        prev_wp = self.waypoints[-1]
        next_wp = self.waypoints[0]

        for i, wp in enumerate(self.waypoints):
            if wp.pct >= pct:
                next_wp = wp
                prev_wp = self.waypoints[i - 1] if i > 0 else self.waypoints[-1]
                break

        if next_wp.pct > prev_wp.pct:
            factor = (pct - prev_wp.pct) / (next_wp.pct - prev_wp.pct)
        else:
            span = (1.0 - prev_wp.pct) + next_wp.pct
            current = (pct - prev_wp.pct) if pct >= prev_wp.pct else ((1.0 - prev_wp.pct) + pct)
            factor = current / max(0.0001, span)

        factor = max(0.0, min(1.0, factor))

        target_speed = prev_wp.speed_kmh + factor * (next_wp.speed_kmh - prev_wp.speed_kmh)
        brake = prev_wp.brake + factor * (next_wp.brake - prev_wp.brake)
        steering = prev_wp.steering + factor * (next_wp.steering - prev_wp.steering)

        return target_speed, brake, steering
