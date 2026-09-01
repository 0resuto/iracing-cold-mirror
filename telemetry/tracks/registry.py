import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional

from telemetry.tracks.schema import TrackDefinition

logger = logging.getLogger(__name__)

# Path to data/tracks relative to project root
TRACKS_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "tracks"


def _normalize_name(name: str) -> str:
    clean = re.sub(r"[^a-zA-Z0-9\s]", " ", name.lower())
    return " ".join(clean.split())


class TrackRegistry:
    # Loading, validating, and indexing track configurations from JSON data repository
    def __init__(self, tracks_dir: Path = TRACKS_DIR):
        self.tracks_dir = tracks_dir
        self._tracks: Dict[str, TrackDefinition] = {}
        self._alias_map: Dict[str, str] = {}
        self.load_tracks()

    def load_tracks(self) -> None:
        # Loads all JSON files from tracks_dir and indexes them
        self._tracks.clear()
        self._alias_map.clear()

        if not self.tracks_dir.exists():
            logger.warning(f"Tracks directory not found: {self.tracks_dir}")
            return

        for file_path in self.tracks_dir.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                track_def = TrackDefinition(**data)
                self.register_track(track_def)
            except Exception as e:
                logger.error(f"Failed to load track definition from {file_path.name}: {e}")

        logger.info(f"Loaded {len(self._tracks)} track definitions from {self.tracks_dir}")

    def register_track(self, track: TrackDefinition) -> None:
        # Registers a track definition and indexes its canonical name and aliases
        self._tracks[track.track_name] = track

        # Index canonical and display name
        self._alias_map[_normalize_name(track.track_name)] = track.track_name
        self._alias_map[_normalize_name(track.display_name)] = track.track_name

        # Index all aliases
        for alias in track.aliases:
            self._alias_map[_normalize_name(alias)] = track.track_name

    def get(self, track_name_or_alias: Optional[str]) -> Optional[TrackDefinition]:
        # Resolves a track definition by canonical name, display name, or alias
        if not track_name_or_alias or not track_name_or_alias.strip():
            return None

        query = _normalize_name(track_name_or_alias)

        # Direct alias / exact match
        if query in self._alias_map:
            canonical_name = self._alias_map[query]
            return self._tracks.get(canonical_name)

        # Substring fallback match (e.g. "tsukuba 2kfull" matches "tsukuba")
        for alias_norm, canonical_name in self._alias_map.items():
            if alias_norm in query or query in alias_norm:
                return self._tracks.get(canonical_name)

        return None

    def list_all(self) -> List[TrackDefinition]:
        return list(self._tracks.values())


# Global singleton instance
track_registry = TrackRegistry()


def get_track_definition(track_name_or_alias: Optional[str]) -> Optional[TrackDefinition]:
    return track_registry.get(track_name_or_alias)
