from telemetry.collector.ibt_reader import IBTReader
from telemetry.collector import run

reader = IBTReader(file_path="dev/telemetry.ibt")
run(reader, track_name=reader.track_name, track_length=7004, player_name=reader.player_name)