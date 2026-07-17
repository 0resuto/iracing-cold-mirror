import sys
from telemetry.database import DBSession
from telemetry.services.importer import import_ibt_to_db

if __name__ == "__main__":
    file_path = "dev/telemetry.ibt" if len(sys.argv) < 2 else sys.argv[1]
    print(f"Starting import of {file_path}")
    import_ibt_to_db(file_path, DBSession)
    print("Import finished!")