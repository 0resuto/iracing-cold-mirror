from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import time
from telemetry.db import SessionLocal as DBSession
from telemetry.services.importer import import_ibt_to_db
import os
from telemetry.config import settings


def scan_existing_files():
    for file in os.listdir(settings.iracing_telemetry_dir):
        if file.endswith('.ibt'):
            import_ibt_to_db(os.path.join(settings.iracing_telemetry_dir, file), DBSession)
    
    return


class TelemetryFileHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.src_path.endswith(".ibt"):
            time.sleep(4)
            try:
                with open(event.src_path, 'ab') as file:
                    pass
                import_ibt_to_db(event.src_path, DBSession)
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

