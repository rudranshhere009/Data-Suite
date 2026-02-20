
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError
from config import DATABASE_URL
from models import AISData, db


# Parse database name from DATABASE_URL
import re
db_name_match = re.search(r'/([a-zA-Z0-9_]+)$', DATABASE_URL)
db_name = db_name_match.group(1) if db_name_match else None

def ensure_database_exists():
    # Managed DB providers already create the DB. Keep creation opt-in for local use.
    should_create = os.getenv("CREATE_DATABASE_IF_MISSING", "false").lower() == "true"
    if not should_create:
        print("Skipping database creation check (CREATE_DATABASE_IF_MISSING=false).")
        return

    # Connect to default 'postgres' database to check/create target db
    default_url = re.sub(r'/[a-zA-Z0-9_]+$', '/postgres', DATABASE_URL)
    default_engine = create_engine(default_url)
    with default_engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname='{db_name}'"))
        if not result.scalar():
            print(f"Database '{db_name}' does not exist. Creating...")
            conn.execute(text(f"CREATE DATABASE {db_name}"))
            print(f"Database '{db_name}' created successfully.")
        else:
            print(f"Database '{db_name}' already exists.")

engine = create_engine(DATABASE_URL)

def load_csv_to_db(csv_path, app=None):
    from sqlalchemy import inspect
    from flask import current_app
    # Use passed app or current_app context
    if app is not None:
        ctx = app.app_context()
        ctx.push()
    else:
        ctx = None
    try:
        inspector = inspect(engine)
        print("Existing tables before loading:", inspector.get_table_names())
        if "ais_data" not in inspector.get_table_names():
            print("Creating ais_data table...")
            db.create_all()
        else:
            print("ais_data table already exists.")

        # Clear ais_data table before loading new data
        print("Deleting existing rows from ais_data table...")
        db.session.query(AISData).delete()
        db.session.commit()
        print("Existing rows deleted.")

        print(f"Loading CSV from: {csv_path}")
        try:
            chunksize = 100000
            total_rows = 0
            for chunk in pd.read_csv(csv_path, chunksize=chunksize):
                print(f"Loaded chunk with {len(chunk)} rows. Columns: {list(chunk.columns)}")
                chunk.to_sql("ais_data", engine, if_exists="append", index=False)
                total_rows += len(chunk)
            print(f"Data Loaded Successfully. Total rows loaded: {total_rows}")
        except Exception as e:
            print(f"Error loading CSV: {e}")
    finally:
        if ctx is not None:
            ctx.pop()
    
# Allow running from command line
if __name__ == "__main__":
    # Hardcoded CSV file path
    csv_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "ships_with_dynamics_heading.csv"))
    load_csv_to_db(csv_path)
