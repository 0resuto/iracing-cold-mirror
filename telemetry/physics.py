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

    if speed > 20.0:
        if brake > 0.1:
            min_wheel_speed = min(lf, rf, lr, rr)
            slip_ratio = (speed - min_wheel_speed) / speed
            if slip_ratio > 0.15:
                data["abs_active"] = 1.0
            if min_wheel_speed < 5.0:
                data["wheel_lock"] = 1.0

        if throttle > 0.3:
            max_rear_speed = max(lr, rr)
            if max_rear_speed > speed * 1.15:
                data["tc_active"] = 1.0

    return data
