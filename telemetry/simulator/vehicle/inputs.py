import math
from typing import Dict

from telemetry.simulator.track import TrackModel


class InputSynthesizer:
    """
    Synthesizes realistic analog driver control signals (Throttle, Brake, Steering, Gear, RPM)
    and vehicle kinematics based on track waypoint dynamics and current vehicle speed.
    """

    def __init__(self, track_model: TrackModel):
        self.track_model = track_model
        self.current_rpm = 5000.0
        self.current_gear = 3
        self.gear_base_speeds = [0, 50, 90, 135, 180, 225, 270]  # Speeds in km/h per gear 1-6
        self.idle_rpm = 3500.0
        self.shift_rpm = 8100.0
        self.max_rpm = 8600.0
        self.prev_speed_kmh = 0.0

    def update(
        self,
        player_speed_kmh: float,
        player_lap_dist_pct: float,
        dt: float,
        grip_factor: float = 1.0,
    ) -> Dict[str, float]:
        """
        Calculates driver controls and vehicle dynamics for a single simulation step.
        """
        _, dyn_brake, dyn_steering = self.track_model.get_target_dynamics(player_lap_dist_pct)
        speed_mps = (player_speed_kmh * 1000.0) / 3600.0

        # 1. Determine Gear from Speed
        if player_speed_kmh > 240.0:
            gear = 6
        elif player_speed_kmh > 195.0:
            gear = 5
        elif player_speed_kmh > 150.0:
            gear = 4
        elif player_speed_kmh > 105.0:
            gear = 3
        elif player_speed_kmh > 65.0:
            gear = 2
        else:
            gear = 1

        self.current_gear = gear

        # 2. Derive RPM from speed in current gear with smoothing
        gear_base = self.gear_base_speeds[gear] if gear < len(self.gear_base_speeds) else 250
        speed_ratio = player_speed_kmh / max(10.0, float(gear_base))
        target_rpm = self.idle_rpm + (self.shift_rpm - self.idle_rpm) * speed_ratio
        target_rpm = max(3800.0, min(self.max_rpm, target_rpm))

        # Smooth RPM response
        self.current_rpm += (target_rpm - self.current_rpm) * 0.25

        # 3. Synthesize Throttle and Brake inputs
        brake = dyn_brake
        if brake > 0.05:
            throttle = 0.0
        else:
            corner_abs = abs(dyn_steering)
            throttle = max(0.2, 1.0 - (corner_abs * 0.6))

        # 4. Shift lights indicator percentage (0.0 to 1.0)
        shift_indicator_pct = max(
            0.0, min(1.0, (self.current_rpm - 6500.0) / max(1.0, (self.shift_rpm - 6500.0)))
        )

        # 5. Steering angle in radians (steer factor mapped to steering wheel rotation)
        wheel_angle_rad = dyn_steering * (math.pi / 3.0)  # Max +/- 60 deg wheel rotation

        # 6. Accelerations (G-forces)
        accel_mps2 = ((player_speed_kmh - self.prev_speed_kmh) * (1000.0 / 3600.0)) / max(0.001, dt)
        self.prev_speed_kmh = player_speed_kmh
        g_lon = accel_mps2 / 9.81

        # Lateral acceleration: a_lat = v^2 / R
        # Steering factor roughly correlates with curvature
        g_lat = (dyn_steering * (speed_mps**2)) / 300.0 / 9.81 * grip_factor
        g_lat = max(-3.5, min(3.5, g_lat))
        g_lon = max(-3.5, min(2.0, g_lon))

        # Yaw rate and lateral velocities
        yaw_rate = (speed_mps * dyn_steering) / 25.0
        vx = speed_mps * math.cos(wheel_angle_rad * 0.1)
        vz = speed_mps * math.sin(wheel_angle_rad * 0.1)

        # 7. Individual wheel speeds (differential effect in cornering)
        track_width_m = 1.6
        inner_outer_delta = (yaw_rate * track_width_m) * (3600.0 / 1000.0) * 0.5
        lf_speed = max(0.0, player_speed_kmh - inner_outer_delta)
        rf_speed = max(0.0, player_speed_kmh + inner_outer_delta)
        lr_speed = max(0.0, player_speed_kmh - inner_outer_delta)
        rr_speed = max(0.0, player_speed_kmh + inner_outer_delta)

        # Small slip angle
        slip_angle_deg = abs(dyn_steering) * 3.5 * (1.0 / max(0.1, grip_factor))

        return {
            "speed": player_speed_kmh,
            "rpm": float(round(self.current_rpm)),
            "gear": self.current_gear,
            "throttle": float(round(throttle, 3)),
            "brake": float(round(brake, 3)),
            "clutch": 0.0,
            "wheel_angle": float(round(wheel_angle_rad, 4)),
            "shift_indicator_pct": float(round(shift_indicator_pct, 3)),
            "g_lat": float(round(g_lat, 3)),
            "g_lon": float(round(g_lon, 3)),
            "yaw_rate": float(round(yaw_rate, 4)),
            "vx": float(round(vx, 2)),
            "vz": float(round(vz, 2)),
            "slip_angle": float(round(slip_angle_deg, 2)),
            "lf_speed": float(round(lf_speed, 2)),
            "rf_speed": float(round(rf_speed, 2)),
            "lr_speed": float(round(lr_speed, 2)),
            "rr_speed": float(round(rr_speed, 2)),
        }
