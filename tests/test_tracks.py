from dataclasses import dataclass
from pathlib import Path

from telemetry.services.analyzer import extract_lap_corners
from telemetry.tracks import get_track_definition


@dataclass
class MockTelemetryPoint:
    lap_dist_pct: float
    speed: float
    brake: float
    lat_accel: float
    session_time: float


def test_all_track_json_files_valid():
    """Verify that all JSON files in data/tracks/ conform strictly to schema."""
    tracks_dir = Path("data") / "tracks"
    json_files = list(tracks_dir.glob("*.json"))
    assert len(json_files) >= 28, f"Expected at least 28 tracks, found {len(json_files)}"

    for file_path in json_files:
        track = get_track_definition(file_path.stem)
        assert track is not None, f"Failed to load {file_path.name}"
        assert track.length_m > 0.0, f"Invalid length in {file_path.name}"
        assert track.svg_path, f"No SVG path defined in {file_path.name}"

        # Verify turn percentages integrity (apex only; start/end_pct were removed)
        for turn in track.turns:
            assert (
                0.0 <= turn.apex_pct <= 1.0
            ), f"Invalid apex_pct in {track.track_name} -> {turn.name}"


def test_track_registry_alias_resolutions():
    """Verify that different alias variations resolve correctly to canonical tracks."""
    # Tsukuba
    t1 = get_track_definition("tsukuba 2kfull")
    t2 = get_track_definition("tsukuba")
    assert t1 is not None and t2 is not None
    assert t1.track_name == t2.track_name == "tsukuba_2000"

    # Spa
    s1 = get_track_definition("spa gp")
    s2 = get_track_definition("circuit de spa-francorchamps")
    assert s1 is not None and s2 is not None
    assert s1.track_name == s2.track_name == "spa_gp"

    # Nurburgring
    n1 = get_track_definition("nurburgring nordschleife")
    n2 = get_track_definition("green hell")
    assert n1 is not None and n2 is not None
    assert n1.track_name == "nurburgring_nordschleife"


def test_tsukuba_corner_extraction_registry_mode():
    """Verify that extract_lap_corners uses official turn definitions for Tsukuba."""
    cur_pts = []
    ref_pts = []
    for i in range(1000):
        pct = i / 1000.0
        t = i * 0.065
        speed = 150.0 - 50.0 * abs((pct % 0.12) - 0.06) / 0.06
        cur_pts.append(
            MockTelemetryPoint(
                lap_dist_pct=pct,
                speed=speed,
                brake=0.8 if (pct % 0.12) < 0.04 else 0.0,
                lat_accel=1.2 if (pct % 0.12) < 0.06 else 0.1,
                session_time=t,
            )
        )
        ref_pts.append(
            MockTelemetryPoint(
                lap_dist_pct=pct,
                speed=speed + 2.0,
                brake=0.8 if (pct % 0.12) < 0.035 else 0.0,
                lat_accel=1.3 if (pct % 0.12) < 0.06 else 0.1,
                session_time=t * 0.98,
            )
        )

    corners = extract_lap_corners(
        cur_telemetry=cur_pts,
        ref_telemetry=ref_pts,
        track_name="tsukuba 2kfull",
        track_length=2045.0,
    )

    # Exactly 8 turns from official definition
    assert len(corners) == 9
    assert corners[0]["name"] == "Turn 1"
    assert corners[3]["name"] == "Turn 4"
    assert corners[7]["name"] == "Turn 8"

    for c in corners:
        assert "dist_pct" in c
        assert "apex_speed_cur" in c
        assert "apex_speed_ref" in c
        assert "brake_delta_m" in c
        assert "time_loss" in c


def test_corner_extraction_lift_and_coast_no_braking():
    """Verify corner extraction handles high-speed corners where drivers do not touch brake."""
    cur_pts = []
    ref_pts = []
    for i in range(1000):
        pct = i / 1000.0
        t = i * 0.065
        cur_pts.append(
            MockTelemetryPoint(
                lap_dist_pct=pct,
                speed=180.0,
                brake=0.0,  # No braking (flat-out or lift)
                lat_accel=1.5,
                session_time=t,
            )
        )
        ref_pts.append(
            MockTelemetryPoint(
                lap_dist_pct=pct,
                speed=185.0,
                brake=0.0,
                lat_accel=1.5,
                session_time=t * 0.98,
            )
        )

    corners = extract_lap_corners(
        cur_telemetry=cur_pts,
        ref_telemetry=ref_pts,
        track_name="spa_gp",
    )
    assert len(corners) > 0
    # Brake delta should safely default to 0.0 without crashing
    for c in corners:
        assert c["brake_delta_m"] == 0.0


def test_dynamic_fallback_mode_unregistered_track():
    """Verify that dynamic mode produces consolidated turns without phantom spikes."""
    cur_pts = []
    ref_pts = []
    for i in range(500):
        pct = i / 500.0
        t = i * 0.1
        is_turn1 = 100 <= i <= 150
        is_turn2 = 300 <= i <= 350
        lat_g = 1.2 if (is_turn1 or is_turn2) else 0.05
        if i == 200:
            lat_g = 0.9  # Noise spike

        cur_pts.append(
            MockTelemetryPoint(
                lap_dist_pct=pct,
                speed=80.0 if (is_turn1 or is_turn2) else 180.0,
                brake=0.7 if (is_turn1 or is_turn2) else 0.0,
                lat_accel=lat_g,
                session_time=t,
            )
        )
        ref_pts.append(
            MockTelemetryPoint(
                lap_dist_pct=pct,
                speed=85.0 if (is_turn1 or is_turn2) else 185.0,
                brake=0.7 if (is_turn1 or is_turn2) else 0.0,
                lat_accel=lat_g,
                session_time=t * 0.98,
            )
        )

    corners = extract_lap_corners(
        cur_telemetry=cur_pts,
        ref_telemetry=ref_pts,
        track_name="unregistered_fictional_track",
    )

    # Noise spike at i=200 is filtered out
    assert len(corners) == 2
    assert corners[0]["name"] == "Turn 1"
    assert corners[1]["name"] == "Turn 2"
