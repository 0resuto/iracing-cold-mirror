def get_exact_start_time(telemetry):
    if len(telemetry) < 2:
        return telemetry[0].session_time if telemetry else 0.0

    p1 = telemetry[0]
    p2 = telemetry[1]

    dist_diff = p2.lap_dist_pct - p1.lap_dist_pct
    if dist_diff <= 0:
        return p1.session_time

    time_diff = p2.session_time - p1.session_time
    time_per_pct = time_diff / dist_diff

    exact_start_time = p1.session_time - (p1.lap_dist_pct * time_per_pct)

    return exact_start_time


def calculate_delta(cur_telemetry, ref_telemetry):
    if not cur_telemetry or not ref_telemetry:
        return []

    cur_start_time = get_exact_start_time(cur_telemetry)
    ref_start_time = get_exact_start_time(ref_telemetry)

    deltas = []
    j = 0
    ref_len = len(ref_telemetry)

    for cur in cur_telemetry:
        while j < ref_len - 1 and ref_telemetry[j].lap_dist_pct < cur.lap_dist_pct:
            j += 1

        if j > 0 and j < ref_len:
            p1 = ref_telemetry[j - 1]
            p2 = ref_telemetry[j]
            dist_diff = p2.lap_dist_pct - p1.lap_dist_pct

            if dist_diff > 0:
                ratio = (cur.lap_dist_pct - p1.lap_dist_pct) / dist_diff
                ref_time_abs = p1.session_time + ratio * (p2.session_time - p1.session_time)
            else:
                ref_time_abs = p2.session_time

            cur_elapsed = cur.session_time - cur_start_time
            ref_elapsed = ref_time_abs - ref_start_time

            deltas.append({"lap_dist_pct": cur.lap_dist_pct, "delta": cur_elapsed - ref_elapsed})
    return deltas
