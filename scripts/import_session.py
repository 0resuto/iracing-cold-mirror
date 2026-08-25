import sys

from telemetry.db import SessionLocal as DBSession
from telemetry.services.importer import import_ibt_to_db

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python -m scripts.import_session <path_to_ibt_file>")
        sys.exit(1)
    file_path = sys.argv[1]
    print(f"Starting import of {file_path}")
    import_ibt_to_db(file_path, DBSession)
    print("Import finished!")
