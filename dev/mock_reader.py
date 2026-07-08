import random


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


class MockReader:
    def __init__(self):
        self.car = Car()

    def read(self):
        # 1. Обновить физику машины (вызвать нужный update_*)
        if self.car.state == "accelerating":
            self.car.update_accelerating()
        elif self.car.state == "braking":
            self.car.update_braking()
        elif self.car.state == "coasting":
            self.car.update_coasting()


        # 2. Собрать словарь и вернуть его

        self.car_data = {
            "speed": self.car.speed,
            "rpm": self.car.rpm,
            "gear": self.car.gear,
            "throttle": self.car.throttle,
            "brake": self.car.brake,
            "wheel_angle": self.car.wheel_angle
        }

        return self.car_data