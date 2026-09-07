"""Database initialisation.

Creates the SQLite database at database/nussif.db from schema.sql.
Idempotent: safe to re-run; existing tables are not recreated.

Usage:
    python database/init_db.py
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "nussif.db"
SCHEMA_PATH = Path(__file__).parent / "schema.sql"


def init_db(db_path: Path = DB_PATH, schema_path: Path = SCHEMA_PATH) -> None:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    schema = schema_path.read_text()
    conn = sqlite3.connect(db_path)
    try:
        conn.executescript(schema)
        conn.commit()
    finally:
        conn.close()
    print(f"Database initialised at {db_path}")


def get_connection(db_path: Path = DB_PATH) -> sqlite3.Connection:
    """Return a sqlite3 connection with foreign keys enabled."""
    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")
    conn.row_factory = sqlite3.Row
    return conn


if __name__ == "__main__":
    init_db()
