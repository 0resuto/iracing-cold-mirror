import os
import sys
import time

import httpx
from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from telemetry.config import settings


def send_file_to_server(file_path: str):
    upload_url = f"{settings.server_url}/api/sessions/upload"
    file_name = os.path.basename(file_path)
    file_size_mb = os.path.getsize(file_path) / (1024 * 1024)

    headers = {}
    if settings.api_key:
        headers["X-API-Key"] = settings.api_key

    print(f"  -> Uploading '{file_name}' ({file_size_mb:.2f} MB)...")
    try:
        file_size_mb = os.path.getsize(file_path) / (1024 * 1024)
        print("  -> Uploading to server (fast)...")

        with open(file_path, "rb") as f:
            files = {"file": (file_name, f, "application/octet-stream")}

            print(
                "  -> Server is processing the file (Parsing IBT & saving to DB). This may take several minutes, please wait..."
            )

            response = httpx.post(upload_url, files=files, headers=headers, timeout=120.0)

            if response.status_code == 200:
                data = response.json()

                if data.get("status") == "accepted":
                    task_id = data.get("task_id")
                    print(f"  -> File sent. Server processing started (Task ID: {task_id}).")

                    while True:
                        status_url = f"{settings.server_url}/api/sessions/upload/{task_id}"
                        status_response = httpx.get(status_url, headers=headers)

                        if status_response.status_code == 200:
                            status_data = status_response.json()
                            current_status = status_data.get("status")

                            if current_status == "done":
                                sys.stdout.write("\r" + " " * 50 + "\r")
                                print(f"  [OK] Successfully processed: {file_name}")
                                break
                            elif current_status == "skipped":
                                sys.stdout.write("\r" + " " * 50 + "\r")
                                print(f"  [SKIP] File already imported: {file_name}")
                                break
                            elif current_status == "error":
                                sys.stdout.write("\r" + " " * 50 + "\r")
                                print(f"  [ERROR] Processing failed: {status_data.get('message')}")
                                break
                            elif current_status == "processing":
                                # ДОСТАЕМ ПРОГРЕСС И ПЕЧАТАЕМ
                                pct = status_data.get("progress", 0.0)
                                sys.stdout.write(f"\r  -> Server processing: {pct:.1f}% ")
                                sys.stdout.flush()

                        time.sleep(1.0)
                else:
                    print(f"  [ERROR] Unknown response: {data}")

            elif response.status_code == 413:
                print(f"  [ERROR] File too large (413). Size: {file_size_mb:.2f} MB")
            else:
                print(f"  [ERROR] Server error [{response.status_code}]: {response.text}")
    except Exception as e:
        print(f"  [CRITICAL] Connection error while uploading {file_name}: {e}")


def scan_existing_files():
    ibt_files = [f for f in os.listdir(settings.iracing_telemetry_dir) if f.endswith(".ibt")]
    if not ibt_files:
        print("No existing .ibt files found.")
        return

    print(f"Found {len(ibt_files)} existing .ibt files. Starting synchronization...")
    for index, file in enumerate(ibt_files, 1):
        print(f"[{index}/{len(ibt_files)}] Processing file...")
        send_file_to_server(os.path.join(settings.iracing_telemetry_dir, file))

    print("Initial scan complete. Watching for new files...")


class TelemetryFileHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.src_path.endswith(".ibt"):
            file_name = os.path.basename(event.src_path)
            print(f"\n[WATCHDOG] New file detected: {file_name}")
            print("Waiting for file to be completely written to disk...")
            time.sleep(4)
            try:
                with open(event.src_path, "ab") as _:
                    pass
                send_file_to_server(event.src_path)
                print("Returning to watch mode...")
            except IOError:
                print(f"File {file_name} is locked. Sync failed.")
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
