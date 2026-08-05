import time

from telemetry.collector.ibt_reader import IBTReader
from telemetry.collector.service import run


class MockReader:
    def __init__(self, file_path):
        self.reader = IBTReader(file_path=file_path)

    @property
    def sectors(self):
        return getattr(self.reader, "sectors", [])

    def read(self):
        data = self.reader.read()

        if data is None:
            self.reader.reset()
            data = self.reader.read()
            if data is None:
                return None

        time.sleep(0.016)
        return data


mock_reader = MockReader(file_path="dev/telemetry.ibt")
run(mock_reader)
