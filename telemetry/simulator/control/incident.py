from typing import Any, Dict, Optional

# Standard iRacing session flag bitmasks
FLAG_CHECKERED = 0x0001
FLAG_WHITE = 0x0002
FLAG_GREEN = 0x0004
FLAG_YELLOW = 0x0008
FLAG_RED = 0x0010
FLAG_BLUE = 0x0020
FLAG_DEBRIS = 0x0040
FLAG_CAUTION = 0x4000
FLAG_CAUTION_WAVING = 0x8000


class IncidentManager:
    """
    Manages session hazards, local yellow flags, Safety Car deployment,
    and calculates iRacing session_flags bitmask.
    """

    def __init__(self):
        self.is_safety_car_active: bool = False
        self.incident_sector: Optional[int] = None
        self.incident_timer: float = 0.0

    def trigger_incident(self, sector: int = 2, duration_s: float = 25.0) -> None:
        """Triggers a local hazard/yellow flag in a given sector."""
        self.incident_sector = sector
        self.incident_timer = duration_s

    def clear_incident(self) -> None:
        """Clears local sector hazards."""
        self.incident_sector = None
        self.incident_timer = 0.0

    def toggle_safety_car(self, active: Optional[bool] = None) -> bool:
        """Deploys or recalls the Safety Car."""
        if active is None:
            self.is_safety_car_active = not self.is_safety_car_active
        else:
            self.is_safety_car_active = active
        return self.is_safety_car_active

    def update(self, dt: float) -> None:
        """Decrements incident timer if active."""
        if self.incident_timer > 0:
            self.incident_timer -= dt
            if self.incident_timer <= 0:
                self.clear_incident()

    def get_session_flags(self) -> int:
        """Returns integer bitmask for SessionFlags."""
        flags = FLAG_GREEN
        if self.is_safety_car_active:
            flags = FLAG_CAUTION | FLAG_CAUTION_WAVING
        elif self.incident_sector is not None:
            flags = FLAG_YELLOW
        return flags

    def get_global_flags(self) -> Dict[str, Any]:
        """Returns flag dictionary used by VehicleAgents during physics steps."""
        return {
            "is_safety_car_active": self.is_safety_car_active,
            "incident_sector": self.incident_sector,
            "session_flags": self.get_session_flags(),
        }
