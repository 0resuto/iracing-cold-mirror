import logging

from telemetry.collector.live_reader import IRacingLiveReader
from telemetry.collector import run


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)


reader = IRacingLiveReader()
run(reader, track_name=reader.track_name, player_name=reader.player_name)
