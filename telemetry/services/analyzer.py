import numpy as np


def extract_lap_corners(
    cur_telemetry: list, ref_telemetry: list, track_length: float | None = None
) -> list[dict]:
    """
    Extracts key corner segments from raw telemetry and calculates
    braking point deltas, apex speed differences, and sector time losses.
    """
    if len(cur_telemetry) < 10 or len(ref_telemetry) < 10:
        return []

    # Current lap numpy arrays
    cur_pct = np.array([p.lap_dist_pct for p in cur_telemetry])
    cur_speed = np.array([p.speed for p in cur_telemetry])
    cur_brake = np.array([p.brake for p in cur_telemetry])
    cur_lat_accel = np.array([abs(p.lat_accel or 0.0) for p in cur_telemetry])
    cur_time = np.array([p.session_time for p in cur_telemetry])

    # Reference lap numpy arrays
    ref_pct = np.array([p.lap_dist_pct for p in ref_telemetry])
    ref_speed = np.array([p.speed for p in ref_telemetry])
    ref_brake = np.array([p.brake for p in ref_telemetry])
    ref_time = np.array([p.session_time for p in ref_telemetry])

    # Corner identification using lateral acceleration threshold (> 0.45G)
    is_corner = cur_lat_accel > 0.45
    corners = []
    in_corner = False
    start_idx = 0

    for i in range(len(is_corner)):
        if is_corner[i] and not in_corner:
            in_corner = True
            start_idx = max(0, i - 15)  # include braking zone before turn-in
        elif not is_corner[i] and in_corner:
            in_corner = False
            end_idx = min(len(cur_telemetry) - 1, i + 10)

            # Minimum corner length filter
            if end_idx - start_idx > 10:
                seg_speed = cur_speed[start_idx:end_idx]
                apex_rel_idx = int(np.argmin(seg_speed))
                apex_idx = start_idx + apex_rel_idx

                corner_dist = float(cur_pct[apex_idx])

                # Match corresponding apex in reference telemetry
                ref_sub_idx = np.argmin(np.abs(ref_pct - corner_dist))
                ref_seg_start = max(0, ref_sub_idx - 15)
                ref_seg_end = min(len(ref_telemetry) - 1, ref_sub_idx + 15)
                ref_apex_idx = ref_seg_start + int(np.argmin(ref_speed[ref_seg_start:ref_seg_end]))

                # 1. Minimum Apex speed delta (km/h)
                apex_speed_cur = float(cur_speed[apex_idx])
                apex_speed_ref = float(ref_speed[ref_apex_idx])
                apex_speed_delta = round(apex_speed_cur - apex_speed_ref, 1)

                # 2. Braking point offset in meters (~4500m nominal lap length)
                brake_start_cur = np.where(cur_brake[start_idx:apex_idx] > 0.1)[0]
                brake_start_ref = np.where(ref_brake[ref_seg_start:ref_apex_idx] > 0.1)[0]

                brake_delta_m = 0.0
                if len(brake_start_cur) > 0 and len(brake_start_ref) > 0:
                    pct_cur_brake = cur_pct[start_idx + brake_start_cur[0]]
                    pct_ref_brake = ref_pct[ref_seg_start + brake_start_ref[0]]
                    # Positive = braked deeper (later), Negative = braked earlier
                    brake_delta_m = round(
                        (pct_cur_brake - pct_ref_brake) * (track_length or 4500.0), 1
                    )

                # 3. Corner segment time loss in seconds
                time_cur_seg = cur_time[end_idx] - cur_time[start_idx]
                time_ref_seg = ref_time[ref_seg_end] - ref_time[ref_seg_start]
                time_loss = round(float(time_cur_seg - time_ref_seg), 2)

                corners.append(
                    {
                        "name": f"Turn {len(corners) + 1}",
                        "dist_pct": round(corner_dist, 3),
                        "apex_speed_cur": round(apex_speed_cur, 1),
                        "apex_speed_ref": round(apex_speed_ref, 1),
                        "apex_speed_delta": apex_speed_delta,
                        "brake_delta_m": brake_delta_m,
                        "time_loss": time_loss,
                    }
                )

    return corners
