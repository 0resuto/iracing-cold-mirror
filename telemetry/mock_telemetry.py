import random
import time


track_info = {
    "TrackLength": "5.15 km",
    "SectorNum": 3,
    "TrackVersion": "2013.1"
}

weekend_info = {
    "TrackName": "nurburgring gp",
    "TrackID": 154,
    "Category": "Road",
    "SessionID": 84321092,
    "TrackDisplayName": "Nürburgring - Grand-Prix-Strecke"
}

lap = 1
lap_current_lap_time = 0        # seconds
lap_best_lap_time = 117.352     # seconds
lap_dist = 0                    # meters
lap_dist_pct = 0                # percent
track_surface = 4               # 0 = NotInWorld, 1 = OffTrack, 2 = InPitStall, 3 = AproachingPits, 4 = OnTrack

GEAR_RANGES = {
    1: (0, 60),
    2: (40, 110),
    3: (80, 160),
    4: (130, 220),
    5: (180, 270),
    6: (230, 310)
}


class Car:
    def __init__(self):
        self.speed = 0                  # km/h
        self.rpm = 800                  # (800 = idle)
        self.gear = 1     
        self.throttle = 0.0             # 0.0 – 1.0
        self.brake = 0.0                # 0.0 – 1.0
        self.wheel_angle = 0.0          # radians
        self.state = "accelerating"

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


car = Car()

try:
    while True:
        if car.state == "accelerating":
            car.update_accelerating()
        elif car.state == "braking":
            car.update_braking()
        elif car.state == "coasting":
            car.update_coasting()
        lap_current_lap_time += 1
        lap_dist += car.speed / 3.6  # км/ч → м/с, за 1 секунду
        lap_dist_pct = lap_dist / 5150
        if lap_dist >= 5150:
            lap_dist = 0
            lap_current_lap_time = 0
            lap_dist_pct = 0
            lap += 1
        print(f"Lap {lap} | {car.speed:6.1f} km/h | RPM {car.rpm:6.0f} | "
            f"G{car.gear} | T:{car.throttle:.1f} B:{car.brake:.1f} | "
            f"Wheel: {car.wheel_angle:+.3f} rad {car.state}")

        time.sleep(0.5)

except KeyboardInterrupt:
    print("Exiting...")