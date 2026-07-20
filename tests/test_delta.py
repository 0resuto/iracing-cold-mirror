from collections import namedtuple
from telemetry.services.delta import get_exact_start_time


MockPoint = namedtuple('MockPoint', ['lap_dist_pct', 'session_time'])


def test_get_exact_start_time_interpolation():
    fake_telemetry = [
        MockPoint(lap_dist_pct=0.01, session_time=100.1),
        MockPoint(lap_dist_pct=0.05, session_time=100.5)
    ]
    
    result = get_exact_start_time(fake_telemetry)
    
    assert round(result, 2) == 100.00

def test_get_exact_start_time_not_enough_data():
    fake_telemetry = [
        MockPoint(lap_dist_pct=0.1, session_time=50.0)
    ]
    
    result = get_exact_start_time(fake_telemetry)
    
    assert result == 50.0