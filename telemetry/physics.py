MIN_SPEED_KMH = 20.0
BRAKE_THRESHOLD = 0.1
THROTTLE_THRESHOLD = 0.3
SLIP_RATIO_THRESHOLD = 0.15
WHEEL_LOCK_SPEED = 5.0
TC_OVERSPEED_RATIO = 1.15


def calculate_wheel_physics(data: dict) -> dict:
    """
    Calculates slip ratio, ABS activation, TC activation, and wheel lock state
    based on current car speed and wheel speeds.
    """
    speed = data.get("speed", 0.0)
    brake = data.get("brake", 0.0)
    throttle = data.get("throttle", 0.0)

    lf = data.get("lf_speed", 0.0)
    rf = data.get("rf_speed", 0.0)
    lr = data.get("lr_speed", 0.0)
    rr = data.get("rr_speed", 0.0)

    data["abs_active"] = 0.0
    data["tc_active"] = 0.0
    data["wheel_lock"] = 0.0

    if speed > MIN_SPEED_KMH:
        if brake > BRAKE_THRESHOLD:
            min_wheel_speed = min(lf, rf, lr, rr)
            slip_ratio = (speed - min_wheel_speed) / speed
            if slip_ratio > SLIP_RATIO_THRESHOLD:
                data["abs_active"] = 1.0
            if min_wheel_speed < WHEEL_LOCK_SPEED:
                data["wheel_lock"] = 1.0

        if throttle > THROTTLE_THRESHOLD:
            max_rear_speed = max(lr, rr)
            if max_rear_speed > speed * TC_OVERSPEED_RATIO:
                data["tc_active"] = 1.0

    return data
