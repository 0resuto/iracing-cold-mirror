import random
import math


GEAR_RANGES = {
    1: (0, 60),
    2: (40, 110),
    3: (80, 160),
    4: (130, 220),
    5: (180, 270),
    6: (230, 310)
}

# Nürburgring GP approximate center point (GPS)
TRACK_CENTER_LAT = 50.3356
TRACK_CENTER_LON = 6.9475
TRACK_RADIUS_LAT = 0.005   # ~500m north-south
TRACK_RADIUS_LON = 0.008   # ~600m east-west (ellipse)


class Car:
    def __init__(self):
        self.speed = 0                  # km/h
        self.rpm = 800                  # (800 = idle)
        self.gear = 1     
        self.throttle = 0.0             # 0.0 – 1.0
        self.brake = 0.0                # 0.0 – 1.0
        self.wheel_angle = 0.0          # radians
        self.state = "accelerating"
        self.prev_speed = 0.0           # for G-force calculation
        self.lat_accel = 0.0            # lateral G (m/s²)
        self.long_accel = 0.0           # longitudinal G (m/s²)
        self.yaw_rate = 0.0             # rad/s
        self.velocity_x = 0.0           # longitudinal velocity (m/s)
        self.velocity_z = 0.0           # lateral velocity (m/s)
        self.slip_angle = 0.0           # radians

        # Wheel speeds (m/s)
        self.lf_speed = 0.0
        self.rf_speed = 0.0
        self.lr_speed = 0.0
        self.rr_speed = 0.0

        # Flags
        self.abs_active = 0.0
        self.tc_active = 0.0
        self.wheel_lock = 0.0

    def _update_derived(self):
        """Calculate derived physics channels from current state."""
        speed_ms = self.speed / 3.6  # km/h -> m/s

        # Longitudinal G: based on speed change (delta_v / delta_t)
        delta_speed_ms = (self.speed - self.prev_speed) / 3.6
        self.long_accel = delta_speed_ms / 0.5  # dt = 0.5s tick
        self.prev_speed = self.speed

        # Lateral G: proportional to steering angle and speed squared
        # a_lat = v² * tan(steering) / wheelbase  (simplified)
        wheelbase = 2.5  # meters (approximate)
        if abs(self.wheel_angle) > 0.01:
            turn_radius = wheelbase / math.tan(abs(self.wheel_angle))
            self.lat_accel = (speed_ms ** 2) / turn_radius
            self.lat_accel = min(self.lat_accel, 40.0)  # cap at ~4G
            if self.wheel_angle < 0:
                self.lat_accel = -self.lat_accel
        else:
            self.lat_accel = 0.0

        # Yaw rate: v / r  (simplified)
        if abs(self.wheel_angle) > 0.01 and speed_ms > 1:
            turn_radius = wheelbase / math.tan(abs(self.wheel_angle))
            self.yaw_rate = speed_ms / turn_radius
            if self.wheel_angle < 0:
                self.yaw_rate = -self.yaw_rate
        else:
            self.yaw_rate = 0.0

        # Velocity decomposition (car local frame)
        self.velocity_x = speed_ms  # forward
        self.velocity_z = speed_ms * math.sin(self.slip_angle)  # lateral

        # Slip angle: small random wobble + bigger during braking in corners
        if self.state == "braking" and abs(self.wheel_angle) > 0.1:
            self.slip_angle += random.uniform(-0.03, 0.03)
            self.slip_angle = max(-0.15, min(0.15, self.slip_angle))
        elif self.state == "accelerating" and self.throttle > 0.8:
            self.slip_angle += random.uniform(-0.01, 0.01)
            self.slip_angle = max(-0.05, min(0.05, self.slip_angle))
        else:
            self.slip_angle *= 0.8  # decay toward 0

        # Wheel speeds: base = car speed, with perturbations
        noise = lambda: random.uniform(-0.5, 0.5)
        self.lf_speed = speed_ms + noise()
        self.rf_speed = speed_ms + noise()
        self.lr_speed = speed_ms + noise()
        self.rr_speed = speed_ms + noise()

        # ABS: during hard braking, front wheels may lock
        self.abs_active = 0.0
        self.wheel_lock = 0.0
        if self.brake > 0.8 and speed_ms > 5:
            if random.random() < 0.3:  # 30% chance per tick
                lock_amount = random.uniform(0.5, 0.9)
                self.lf_speed *= lock_amount
                self.rf_speed *= lock_amount
                self.abs_active = 1.0
            if random.random() < 0.05:  # 5% chance of full lock
                self.lf_speed = 0.1
                self.wheel_lock = 1.0

        # TC: during hard acceleration out of corners, rear wheels may spin
        self.tc_active = 0.0
        if self.throttle > 0.9 and self.gear <= 3 and speed_ms > 5:
            if random.random() < 0.25:  # 25% chance per tick
                spin_factor = random.uniform(1.1, 1.5)
                self.lr_speed *= spin_factor
                self.rr_speed *= spin_factor
                self.tc_active = 1.0

    def update_accelerating(self):
        min_speed, max_speed = GEAR_RANGES[self.gear]
        
        # speed
        absolute_max_speed = GEAR_RANGES[max(GEAR_RANGES.keys())][1]
        if self.speed < absolute_max_speed:
            self.speed += random.uniform(3, 8)
        
        # gear
        if self.speed > max_speed and self.gear < max(GEAR_RANGES.keys()):
            self.gear += 1
        if self.speed < min_speed and self.gear > min(GEAR_RANGES.keys()):
            self.gear -= 1

        #rpm
        min_speed, max_speed = GEAR_RANGES[self.gear]
        self.rpm = 800 + (self.speed - min_speed) / (max_speed - min_speed) * 7200

        # throttle
        if self.throttle < 1:
            self.throttle = min(self.throttle + 0.1, 1.0)
        
        # brake
        if self.brake > 0:
            self.brake = max(self.brake - 0.2, 0.0)

        # wheel_angle
        if abs(self.wheel_angle) > 0.01:
            self.wheel_angle *= 0.85
        else:
            self.wheel_angle = 0.0

        # state
        if self.speed >= random.uniform(240, 280):
            self.state = "braking"
    
    def update_braking(self):
        min_speed, max_speed = GEAR_RANGES[self.gear]
        
        # speed
        self.speed = max(self.speed - random.uniform(20, 30), 0)
        
        # gear
        if self.speed > max_speed and self.gear < max(GEAR_RANGES.keys()):
            self.gear += 1
        if self.speed < min_speed and self.gear > min(GEAR_RANGES.keys()):
            self.gear -= 1

        # rpm
        min_speed, max_speed = GEAR_RANGES[self.gear]
        self.rpm = 800 + (self.speed - min_speed) / (max_speed - min_speed) * 7200

        # throttle
        if self.throttle > 0:
            self.throttle = max(self.throttle - 0.1, 0.0)
        
        # brake
        if self.brake < 1:
            self.brake = min(self.brake + 0.2, 1.0)

        # wheel_angle
        target = random.choice([-1, 1]) * random.uniform(0.15, 0.5)
        self.wheel_angle += (target - self.wheel_angle) * 0.3

        # state
        if self.speed <= random.uniform(30, 70):
            self.state = "coasting"

    def update_coasting(self):
        min_speed, max_speed = GEAR_RANGES[self.gear]

        # speed
        self.speed = min(max(self.speed + random.uniform(-3, 3), 0), max_speed)
        
        # gear
        if self.speed > max_speed and self.gear < max(GEAR_RANGES.keys()):
            self.gear += 1
        if self.speed < min_speed and self.gear > min(GEAR_RANGES.keys()):
            self.gear -= 1

        # rpm
        min_speed, max_speed = GEAR_RANGES[self.gear]
        self.rpm = 800 + (self.speed - min_speed) / (max_speed - min_speed) * 7200

        # throttle
        if self.throttle > 0:
            self.throttle = max(self.throttle - 0.1, 0.0)
        
        # brake
        if self.brake > 0:
            self.brake = max(self.brake - 0.02, 0.0)

        # wheel_angle
        self.wheel_angle += random.uniform(-0.03, 0.03)
        self.wheel_angle = max(-0.1, min(0.1, self.wheel_angle))
        
        # state
        if self.speed <= random.uniform(20, 60):
            self.state = "accelerating"


class MockReader:
    def __init__(self):
        self.car = Car()
        self.lap_dist_pct = 0.0  # track progress for GPS calculation

    def set_lap_dist_pct(self, pct):
        """Called externally to sync track position for GPS coords."""
        self.lap_dist_pct = pct

    def read(self):
        if self.car.state == "accelerating":
            self.car.update_accelerating()
        elif self.car.state == "braking":
            self.car.update_braking()
        elif self.car.state == "coasting":
            self.car.update_coasting()

        # Calculate derived physics
        self.car._update_derived()

        # GPS position: drive around an ellipse based on lap progress
        angle = self.lap_dist_pct * 2 * math.pi - (math.pi / 2)
        lat = TRACK_CENTER_LAT + TRACK_RADIUS_LAT * math.sin(angle)
        lon = TRACK_CENTER_LON + TRACK_RADIUS_LON * math.cos(angle)

        self.car_data = {
            "speed": self.car.speed,
            "rpm": self.car.rpm,
            "gear": self.car.gear,
            "throttle": self.car.throttle,
            "brake": self.car.brake,
            "wheel_angle": self.car.wheel_angle,
            "lat": lat,
            "lon": lon,
            "lat_accel": self.car.lat_accel,
            "long_accel": self.car.long_accel,
            "yaw_rate": self.car.yaw_rate,
            "velocity_x": self.car.velocity_x,
            "velocity_z": self.car.velocity_z,
            "slip_angle": self.car.slip_angle,
            "lf_speed": self.car.lf_speed,
            "rf_speed": self.car.rf_speed,
            "lr_speed": self.car.lr_speed,
            "rr_speed": self.car.rr_speed,
            "abs_active": self.car.abs_active,
            "tc_active": self.car.tc_active,
            "wheel_lock": self.car.wheel_lock,
        }

        return self.car_data