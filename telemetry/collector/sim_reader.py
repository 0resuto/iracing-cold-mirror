import time
from typing import Any, Dict, List, Optional

from telemetry.simulator.config import SimulationScenarioConfig
from telemetry.simulator.engine import SimulatorEngine


class SyntheticSimulatorReader:
    """
    Adapter bridging SimulatorEngine to the duck-typed interface expected
    by telemetry.collector.service.run(reader).
    """

    def __init__(
        self,
        scenario: Optional[SimulationScenarioConfig] = None,
        engine: Optional[SimulatorEngine] = None,
        is_embedded: bool = False,
    ):
        self.scenario = scenario or SimulationScenarioConfig()
        self.engine = engine or SimulatorEngine(self.scenario)
        self.is_embedded = is_embedded
        self._is_running = True
        self._last_tick_time = time.perf_counter()
        self._target_frame_time = 1.0 / self.scenario.target_fps

    @property
    def sectors(self) -> List[Dict[str, Any]]:
        return self.engine.track_model.get_sectors_list()

    @property
    def session_drivers(self) -> List[Dict[str, Any]]:
        return self.engine.fleet.get_session_drivers()

    @property
    def track_name(self) -> str:
        return self.engine.track_model.config.name

    @property
    def track_id(self) -> int:
        return self.engine.track_model.config.track_id

    @property
    def player_name(self) -> str:
        return self.engine.fleet.get_player().driver.user_name

    @property
    def car_name(self) -> str:
        return self.engine.fleet.get_player().driver.car_screen_name

    def read(self) -> Optional[Dict[str, Any]]:
        """
        Executes or fetches a single simulation frame and regulates frame pacing (60 FPS).
        Returns None when closed to signal service.run() to terminate cleanly.
        """
        if not self._is_running:
            return None

        if self.is_embedded:
            time.sleep(self._target_frame_time)
            return self.engine.latest_frame or self.engine.step()

        frame = self.engine.step()

        # Frame rate limiter for 60 FPS
        now = time.perf_counter()
        elapsed = now - self._last_tick_time
        sleep_duration = self._target_frame_time - elapsed
        if sleep_duration > 0:
            time.sleep(sleep_duration)
        self._last_tick_time = time.perf_counter()

        return frame

    def reset(self) -> None:
        """Resets the simulation session."""
        self.engine = SimulatorEngine(self.scenario)
        self._is_running = True
        self._last_tick_time = time.perf_counter()

    def close(self) -> None:
        """Stops simulation loop and signals reader termination."""
        self._is_running = False
