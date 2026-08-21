from telemetry.collector.sim_reader import SyntheticSimulatorReader
from telemetry.simulator.config import SimulationScenarioConfig
from telemetry.simulator.control.incident import (
    FLAG_CAUTION,
    FLAG_GREEN,
    FLAG_YELLOW,
    IncidentManager,
)
from telemetry.simulator.engine import SimulatorEngine
from telemetry.simulator.environment.weather import WeatherModel
from telemetry.simulator.track import SPA_TRACK_CONFIG, TrackModel
from telemetry.simulator.vehicle.fleet import MultiClassFleet
from telemetry.simulator.vehicle.inputs import InputSynthesizer


def test_track_model_sectors_and_pit_lane():
    track = TrackModel(SPA_TRACK_CONFIG)
    assert track.get_sector_id(0.10) == 1
    assert track.get_sector_id(0.50) == 2
    assert track.get_sector_id(0.90) == 3

    assert track.is_in_pit_road(0.97) is True
    assert track.is_in_pit_road(0.50) is False

    target_speed, brake, steer = track.get_target_dynamics(0.04)  # La Source Hairpin
    assert brake > 0.5
    assert target_speed < 100.0


def test_input_synthesizer_ranges():
    track = TrackModel(SPA_TRACK_CONFIG)
    synth = InputSynthesizer(track)

    inputs = synth.update(player_speed_kmh=180.0, player_lap_dist_pct=0.20, dt=0.016)
    assert 0.0 <= inputs["throttle"] <= 1.0
    assert 0.0 <= inputs["brake"] <= 1.0
    assert inputs["gear"] in (1, 2, 3, 4, 5, 6)
    assert inputs["rpm"] >= 3500.0
    assert -1.5 <= inputs["wheel_angle"] <= 1.5


def test_multiclass_fleet_and_grid():
    track = TrackModel(SPA_TRACK_CONFIG)
    fleet = MultiClassFleet(track)

    assert len(fleet.agents) == 16
    player = fleet.get_player()
    assert player.is_player is True
    assert player.car_idx == 9

    fleet.update(dt=0.1, session_time=10.0, global_flags={"is_safety_car_active": False})
    grid_data = fleet.get_grid_telemetry()

    assert "grid" in grid_data
    assert len(grid_data["grid"]) == 16
    assert "9" in grid_data["grid"]
    assert "Position" in grid_data["grid"]["9"]
    assert "ClassPosition" in grid_data["grid"]["9"]
    assert "F2Time" in grid_data["grid"]["9"]


def test_weather_and_incident_state_machines():
    weather = WeatherModel()
    assert weather.get_grip_factor() == 1.0
    weather.toggle_rain(True)
    weather.update(dt=5.0, session_time=5.0)
    assert weather.get_grip_factor() < 1.0

    incidents = IncidentManager()
    assert incidents.get_session_flags() == FLAG_GREEN

    incidents.trigger_incident(sector=2, duration_s=10.0)
    assert incidents.get_session_flags() == FLAG_YELLOW

    incidents.toggle_safety_car(True)
    assert incidents.get_session_flags() & FLAG_CAUTION != 0


def test_simulator_engine_step_and_reader_contract():
    scenario = SimulationScenarioConfig(
        track_name="spa",
        duration_seconds=600,
        total_laps=5,
        target_fps=60,
    )
    engine = SimulatorEngine(scenario)
    frame = engine.step(dt=0.016)

    # Check required fields for service.py live_data dictionary
    required_keys = [
        "player_car_idx",
        "track_id",
        "track_name",
        "player_name",
        "car_name",
        "lap_number",
        "lap_dist_pct",
        "session_time",
        "speed",
        "rpm",
        "gear",
        "throttle",
        "brake",
        "wheel_angle",
        "g_lat",
        "g_lon",
        "grid",
        "session_drivers",
        "sectors",
    ]
    for key in required_keys:
        assert key in frame, f"Missing key '{key}' in simulation frame"

    reader = SyntheticSimulatorReader(scenario, engine=engine)
    assert reader.track_name == "Circuit de Spa-Francorchamps"
    assert reader.player_name == "Simulated Driver"
    assert len(reader.session_drivers) == 16
    assert len(reader.sectors) == 3

    sample = reader.read()
    assert sample is not None
    assert sample["speed"] > 0
    reader.close()


def test_simulator_in_memory_control_and_status():
    scenario = SimulationScenarioConfig(
        track_name="spa",
        duration_seconds=600,
        total_laps=5,
        target_fps=60,
    )
    engine = SimulatorEngine(scenario)
    engine.start()

    # Test status snapshot schema
    status = engine.get_status()
    assert "session_time" in status
    assert "player_speed_kmh" in status
    assert "grip_factor" in status
    assert "car_left_right" in status

    # Direct in-memory mutations
    engine.toggle_pause(paused=True)
    engine.set_weather(rain=0.8, track_temp=18.0, air_temp=15.0)
    engine.force_pit_stop(car_idx=9)
    engine.refuel(car_idx=9, refuel_full=True)
    engine.set_spotter_override(mode=2)  # Force Car Left
    engine.trigger_damage(car_idx=9, puncture=True)

    frame = engine.step(dt=0.016)

    assert engine.is_paused is True
    assert engine.weather.rain_intensity == 0.8
    assert engine.fleet.get_player().is_pitting is True
    assert engine.fleet.get_player().is_punctured is True
    assert frame["car_left_right"] == 2

    # Test repair
    engine.trigger_damage(car_idx=9, repair=True)
    engine.step(dt=0.016)
    assert engine.fleet.get_player().is_punctured is False

    engine.stop()
