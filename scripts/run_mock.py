from telemetry.collector.ibt_reader import IBTReader
from telemetry.collector.service import run

reader = IBTReader(file_path="dev/telemetry.ibt")
run(reader)
