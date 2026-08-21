import math
from typing import Dict, Optional


class WeatherModel:
    """
    Simulates ambient weather, track temperature, dynamic rain, and asphalt grip factors.
    """

    def __init__(
        self,
        initial_air_temp: float = 21.5,
        initial_track_temp: float = 28.0,
        initial_wind_vel: float = 3.2,
        initial_wind_dir: float = 0.85,
    ):
        self.air_temp = initial_air_temp
        self.track_temp = initial_track_temp
        self.wind_vel = initial_wind_vel
        self.wind_dir = initial_wind_dir
        self.skies = 1  # 0=Clear, 1=PartlyCloudy, 2=MostlyCloudy, 3=Overcast
        self.rain_intensity = 0.0  # 0.0 to 1.0
        self.track_wetness = 0.0  # 0.0 to 1.0

    def toggle_rain(self, enabled: Optional[bool] = None) -> bool:
        """Toggles rain on or off."""
        if enabled is None:
            enabled = self.rain_intensity < 0.1

        if enabled:
            self.rain_intensity = 0.75
            self.skies = 3  # Overcast
            self.track_temp = max(16.0, self.track_temp - 6.0)
        else:
            self.rain_intensity = 0.0
            self.skies = 1  # Partly cloudy
            self.track_temp = min(32.0, self.track_temp + 4.0)

        return self.rain_intensity > 0.0

    def set_weather(
        self,
        air_temp: Optional[float] = None,
        track_temp: Optional[float] = None,
        rain: Optional[float] = None,
    ) -> None:
        """Sets custom weather parameters."""
        if air_temp is not None:
            self.air_temp = air_temp
        if track_temp is not None:
            self.track_temp = track_temp
        if rain is not None:
            self.rain_intensity = max(0.0, min(1.0, rain))
            self.skies = 3 if self.rain_intensity > 0.3 else 1

    def update(self, dt: float, session_time: float) -> None:
        """Updates dynamic track wetness and minor temperature oscillations."""
        if dt <= 0:
            return

        # Gradual track wetness accumulation / dry-out
        if self.rain_intensity > 0.05:
            self.track_wetness = min(1.0, self.track_wetness + 0.05 * dt)
        else:
            self.track_wetness = max(0.0, self.track_wetness - 0.02 * dt)

        # Micro weather fluctuation
        sine_drift = math.sin(session_time * 0.01) * 0.2
        self.wind_vel = max(0.5, 3.2 + sine_drift)

    def get_grip_factor(self) -> float:
        """Calculates grip multiplier for vehicle dynamics (1.0 = full dry grip)."""
        return max(0.65, 1.0 - (0.35 * self.track_wetness))

    def get_telemetry_frame(self) -> Dict[str, float]:
        """Returns environment telemetry dictionary."""
        return {
            "air_temp": float(round(self.air_temp, 1)),
            "track_temp": float(round(self.track_temp, 1)),
            "wind_vel": float(round(self.wind_vel, 1)),
            "wind_dir": float(round(self.wind_dir, 2)),
            "skies": self.skies,
        }
