from dev.mock_reader import MockReader
from telemetry.collector import run

reader = MockReader()
run(reader, track_name="Nürburgring GP (Mock)", player_name="RacerX")