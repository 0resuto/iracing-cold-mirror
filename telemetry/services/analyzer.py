import numpy as np

from telemetry.tracks import get_track_definition


def extract_lap_corners(
    cur_telemetry: list,
    ref_telemetry: list,
    track_name: str | None = None,
    track_length: float | None = None,
) -> list[dict]:
    """
    Extracts key corner segments from raw telemetry.
    Uses official track definitions from TrackRegistry when available,
    falling back to smoothed dynamic peak/hysteresis extraction.
    """
    if len(cur_telemetry) < 10 or len(ref_telemetry) < 10:
        return []

    # Current lap telemetry arrays
    cur_pct = np.array([p.lap_dist_pct for p in cur_telemetry])
    cur_speed = np.array([p.speed for p in cur_telemetry])
    cur_brake = np.array([p.brake for p in cur_telemetry])
    cur_lat_accel = np.array([abs(p.lat_accel or 0.0) for p in cur_telemetry])
    cur_time = np.array([p.session_time for p in cur_telemetry])

    # Reference lap telemetry arrays
    ref_pct = np.array([p.lap_dist_pct for p in ref_telemetry])
    ref_speed = np.array([p.speed for p in ref_telemetry])
    ref_brake = np.array([p.brake for p in ref_telemetry])
    ref_time = np.array([p.session_time for p in ref_telemetry])

    # Check Track Registry
    track_def = get_track_definition(track_name)
    effective_length = track_length or (track_def.length_m if track_def else 4500.0)

    corners = []

    if track_def and track_def.turns:
        # Official Track Registry Definitions
        for turn in track_def.turns:
            c_mask = (cur_pct >= turn.start_pct) & (cur_pct <= turn.end_pct)
            r_mask = (ref_pct >= turn.start_pct) & (ref_pct <= turn.end_pct)

            c_indices = np.where(c_mask)[0]
            r_indices = np.where(r_mask)[0]

            if len(c_indices) < 3 or len(r_indices) < 3:
                continue

            # Apex identification
            c_apex_rel = int(np.argmin(cur_speed[c_indices]))
            r_apex_rel = int(np.argmin(ref_speed[r_indices]))

            c_apex_idx = c_indices[c_apex_rel]
            r_apex_idx = r_indices[r_apex_rel]

            apex_speed_cur = float(cur_speed[c_apex_idx])
            apex_speed_ref = float(ref_speed[r_apex_idx])
            apex_speed_delta = round(apex_speed_cur - apex_speed_ref, 1)

            # Braking point offset
            c_brake_hits = np.where(cur_brake[c_indices[0] : c_apex_idx + 1] > 0.1)[0]
            r_brake_hits = np.where(ref_brake[r_indices[0] : r_apex_idx + 1] > 0.1)[0]

            brake_delta_m = 0.0
            if len(c_brake_hits) > 0 and len(r_brake_hits) > 0:
                pct_c_brake = cur_pct[c_indices[0] + c_brake_hits[0]]
                pct_r_brake = ref_pct[r_indices[0] + r_brake_hits[0]]
                brake_delta_m = round((pct_c_brake - pct_r_brake) * effective_length, 1)

            # Segment time loss
            time_cur_seg = cur_time[c_indices[-1]] - cur_time[c_indices[0]]
            time_ref_seg = ref_time[r_indices[-1]] - ref_time[r_indices[0]]
            time_loss = round(float(time_cur_seg - time_ref_seg), 2)

            corners.append(
                {
                    "name": turn.name,
                    "dist_pct": round(float(cur_pct[c_apex_idx]), 3),
                    "apex_speed_cur": round(apex_speed_cur, 1),
                    "apex_speed_ref": round(apex_speed_ref, 1),
                    "apex_speed_delta": apex_speed_delta,
                    "brake_delta_m": brake_delta_m,
                    "time_loss": time_loss,
                }
            )

        return corners

    # Dynamic Fallback with Smoothing & Hysteresis
    kernel_size = 25  # ~0.4s window for 60Hz
    kernel = np.ones(kernel_size) / kernel_size
    smoothed_lat = np.convolve(cur_lat_accel, kernel, mode="same")

    in_corner = False
    start_idx = 0
    raw_segments = []

    for i in range(len(smoothed_lat)):
        # Hysteresis entry
        if smoothed_lat[i] > 0.50 and not in_corner:
            in_corner = True
            start_idx = max(0, i - 15)
        elif smoothed_lat[i] < 0.25 and in_corner:
            in_corner = False
            end_idx = min(len(cur_telemetry) - 1, i + 10)
            if end_idx - start_idx > 25:
                raw_segments.append((start_idx, end_idx))

    # Merge adjacent segments separated by less than 40 meters
    merged_segments = []
    for seg in raw_segments:
        if not merged_segments:
            merged_segments.append(seg)
        else:
            prev_start, prev_end = merged_segments[-1]
            dist_between = (cur_pct[seg[0]] - cur_pct[prev_end]) * effective_length
            if dist_between < 40.0:
                merged_segments[-1] = (prev_start, seg[1])
            else:
                merged_segments.append(seg)

    for start_i, end_i in merged_segments:
        seg_speed = cur_speed[start_i:end_i]
        apex_rel = int(np.argmin(seg_speed))
        apex_idx = start_i + apex_rel
        corner_dist = float(cur_pct[apex_idx])

        # Match in reference
        ref_sub_idx = np.argmin(np.abs(ref_pct - corner_dist))
        ref_start = max(0, ref_sub_idx - 25)
        ref_end = min(len(ref_telemetry) - 1, ref_sub_idx + 25)
        ref_apex_idx = ref_start + int(np.argmin(ref_speed[ref_start:ref_end]))

        apex_speed_cur = float(cur_speed[apex_idx])
        apex_speed_ref = float(ref_speed[ref_apex_idx])
        apex_speed_delta = round(apex_speed_cur - apex_speed_ref, 1)

        c_brake_hits = np.where(cur_brake[start_i:apex_idx] > 0.1)[0]
        r_brake_hits = np.where(ref_brake[ref_start:ref_apex_idx] > 0.1)[0]

        brake_delta_m = 0.0
        if len(c_brake_hits) > 0 and len(r_brake_hits) > 0:
            pct_c = cur_pct[start_i + c_brake_hits[0]]
            pct_r = ref_pct[ref_start + r_brake_hits[0]]
            brake_delta_m = round((pct_c - pct_r) * effective_length, 1)

        time_cur = cur_time[end_i] - cur_time[start_i]
        time_ref = ref_time[ref_end] - ref_time[ref_start]
        time_loss = round(float(time_cur - time_ref), 2)

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
