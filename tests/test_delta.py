from collections import namedtuple

from telemetry.services.delta import calculate_delta, get_exact_start_time

MockPoint = namedtuple("MockPoint", ["lap_dist_pct", "session_time"])


def test_get_exact_start_time_interpolation():
    fake_telemetry = [
        MockPoint(lap_dist_pct=0.01, session_time=100.1),
        MockPoint(lap_dist_pct=0.05, session_time=100.5),
    ]

    result = get_exact_start_time(fake_telemetry)

    assert round(result, 2) == 100.00


def test_get_exact_start_time_not_enough_data():
    fake_telemetry = [MockPoint(lap_dist_pct=0.1, session_time=50.0)]

    result = get_exact_start_time(fake_telemetry)

    assert result == 50.0


def test_calculate_delta_empty():
    assert calculate_delta([], []) == []
    assert calculate_delta([MockPoint(0.1, 10.0)], []) == []
    assert calculate_delta([], [MockPoint(0.1, 10.0)]) == []


def test_calculate_delta_identical_laps():
    cur = [
        MockPoint(lap_dist_pct=0.00, session_time=100.0),
        MockPoint(lap_dist_pct=0.50, session_time=130.0),
        MockPoint(lap_dist_pct=1.00, session_time=160.0),
    ]
    ref = [
        MockPoint(lap_dist_pct=0.00, session_time=200.0),
        MockPoint(lap_dist_pct=0.50, session_time=230.0),
        MockPoint(lap_dist_pct=1.00, session_time=260.0),
    ]

    deltas = calculate_delta(cur, ref)
    assert len(deltas) > 0
    for d in deltas:
        assert abs(d["delta"]) < 1e-5


def test_calculate_delta_slower_lap():
    cur = [
        MockPoint(lap_dist_pct=0.00, session_time=100.0),
        MockPoint(lap_dist_pct=0.50, session_time=135.0),  # 5 seconds slower at midpoint
        MockPoint(lap_dist_pct=1.00, session_time=170.0),  # 10 seconds slower overall
    ]
    ref = [
        MockPoint(lap_dist_pct=0.00, session_time=200.0),
        MockPoint(lap_dist_pct=0.50, session_time=230.0),
        MockPoint(lap_dist_pct=1.00, session_time=260.0),
    ]

    deltas = calculate_delta(cur, ref)
    assert len(deltas) > 0
    mid_point = next(d for d in deltas if d["lap_dist_pct"] == 0.50)
    assert round(mid_point["delta"], 2) == 5.0
