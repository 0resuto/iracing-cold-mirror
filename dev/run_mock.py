from dev.mock_reader import MockReader
from telemetry.collector import run

reader = MockReader()
run(reader, track_name="Spa-Francorchamps", track_length=7004, player_name="RacerX")