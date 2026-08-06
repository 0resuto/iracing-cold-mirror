import os
import sys
import time

from telemetry.collector.ibt_reader import IBTReader
from telemetry.collector.service import run


class MockReader:
    def __init__(self, file_path):
        self.reader = IBTReader(file_path=file_path)

    @property
    def sectors(self):
        return getattr(self.reader, "sectors", [])

    @property
    def track_name(self):
        return getattr(self.reader, "track_name", "Unknown Track")

    @property
    def track_id(self):
        return getattr(self.reader, "track_id", None)

    @property
    def player_name(self):
        return getattr(self.reader, "player_name", "Unknown Player")

    @property
    def car_name(self):
        return getattr(self.reader, "car_name", "Unknown Car")

    def read(self):
        data = self.reader.read()

        if data is None:
            self.reader.reset()
            data = self.reader.read()
            if data is None:
                return None

        time.sleep(0.016)
        return data


file_path = "dev/telemetry.ibt"

if not os.path.exists(file_path):
    print(f"❌ Error: Telemetry file '{file_path}' not found!")
    print("Please rename your .ibt file in the 'dev' folder to 'telemetry.ibt'.")
    sys.exit(1)

mock_reader = MockReader(file_path=file_path)
run(mock_reader)
