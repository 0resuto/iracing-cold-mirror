import os
import time

import httpx
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from telemetry.config import settings


def send_file_to_server(file_path: str):
    upload_url = f"{settings.server_url}/api/sessions/upload"
    try:
        with open(file_path, "rb") as f:
            files = {"file": (os.path.basename(file_path), f, "application/octet-stream")}
            response = httpx.post(upload_url, files=files, timeout=60)

            if response.status_code == 200:
                print(f"Successfully uploaded: {os.path.basename(file_path)}")
            else:
                print(f"Server error [{response.status_code}]: {response.text}")
    except Exception as e:
        print(f"Connection error while uploading {os.path.basename(file_path)}: {e}")


def scan_existing_files():
    for file in os.listdir(settings.iracing_telemetry_dir):
        if file.endswith(".ibt"):
            send_file_to_server(os.path.join(settings.iracing_telemetry_dir, file))

    return


class TelemetryFileHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.src_path.endswith(".ibt"):
            time.sleep(4)
            try:
                with open(event.src_path, "ab") as _:
                    pass
                send_file_to_server(event.src_path)
            except IOError:
                return
        return


if __name__ == "__main__":
    scan_existing_files()
    event_handler = TelemetryFileHandler()
    observer = Observer()
    observer.schedule(event_handler, settings.iracing_telemetry_dir, recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()

    observer.join()
