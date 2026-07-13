import sys
import os

project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(project_root)

from telemetry.database import engine, Base

print("Dropping tables...")
Base.metadata.drop_all(engine)

print("Creating tables...")
Base.metadata.create_all(engine)
print("Done!")