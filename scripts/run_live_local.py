import logging

import colorlog

from telemetry.collector.live_reader import IRacingLiveReader
from telemetry.collector.service import run
from telemetry.config import settings

# Force local dev target: point at the local dev API. The API key is kept as-is
# from .env, since the local dev API enforces the same token.
settings.server_url = "http://localhost:8000"

handler = colorlog.StreamHandler()
handler.setFormatter(
    colorlog.ColoredFormatter(
        "%(log_color)s%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        log_colors={
            "DEBUG": "cyan",
            "INFO": "green",
            "WARNING": "yellow",
            "ERROR": "red",
            "CRITICAL": "red,bg_white",
        },
    )
)
logger = logging.getLogger()
logger.addHandler(handler)
logger.setLevel(logging.INFO)
logger.info("Local live telemetry streamer -> ws://localhost:8000")

reader = IRacingLiveReader()
run(reader)
