import time
from dev.mock_reader import MockReader

reader = MockReader()

while True:
    data = reader.read()
    print(data)
    time.sleep(0.5)