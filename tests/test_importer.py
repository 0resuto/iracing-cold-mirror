from unittest.mock import MagicMock, patch

from telemetry.db.models import Lap, Sector, Session, Telemetry
from telemetry.services.importer import import_ibt_to_db

FAKE_TELEMETRY = [
    {
        "lap": 0,
        "session_time": 10.0,
        "lap_dist_pct": 0.05,
        "speed": 100,
        "rpm": 5000,
        "gear": 2,
        "throttle": 1.0,
        "brake": 0.0,
        "wheel_angle": 0.0,
    },
    {
        "lap": 1,
        "session_time": 25.0,
        "lap_dist_pct": 0.99,
        "speed": 150,
        "rpm": 6000,
        "gear": 3,
        "throttle": 1.0,
        "brake": 0.0,
        "wheel_angle": 0.0,
    },
    {
        "lap": 1,
        "session_time": 30.0,
        "lap_dist_pct": 0.10,
        "speed": 200,
        "rpm": 7000,
        "gear": 4,
        "throttle": 1.0,
        "brake": 0.0,
        "wheel_angle": 0.0,
    },
]


@patch("telemetry.services.importer.get_file_hash")
@patch("telemetry.services.importer.IBTReader")
def test_import_ibt_to_db_happy_path(mock_reader_class, mock_get_file_hash, db_session):
    mock_get_file_hash.return_value = "fake_hash_123"
    mock_instance = MagicMock()
    mock_instance.player_name = "Test Player"
    mock_instance.track_name = "Test Track"
    mock_instance.car_name = "Test Car"
    mock_instance.sectors = [{"SectorStartPct": 0.0}, {"SectorStartPct": 0.5}]
    mock_instance.num_samples = len(FAKE_TELEMETRY)
    mock_instance.redline_rpm = 8500

    mock_instance.read.side_effect = FAKE_TELEMETRY + [None]

    mock_reader_class.return_value = mock_instance

    success = import_ibt_to_db("dummy_path.ibt", lambda: db_session)

    assert success is True

    session = db_session.query(Session).first()
    assert session is not None
    assert session.track_name == "Test Track"
    assert session.player.name == "Test Player"

    laps = db_session.query(Lap).order_by(Lap.lap_number).all()
    assert len(laps) == 2
    assert laps[0].lap_number == 0
    assert laps[1].lap_number == 1

    sectors = db_session.query(Sector).all()
    assert len(sectors) == 2

    telemetry_points = db_session.query(Telemetry).count()
    assert telemetry_points == len(FAKE_TELEMETRY)
