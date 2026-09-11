"""SQLite repository — connection management and SQL execution helpers."""

from __future__ import annotations

import sqlite3
from typing import Any, Iterable

from backend.app.core.config import settings


def _connect(read_only: bool = False) -> sqlite3.Connection:
    """Create a configured SQLite connection with WAL mode and memory tuning."""
    path = settings.database_url.replace("sqlite:///", "")
    conn = sqlite3.connect(path, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    # Apply institutional WAL and caching pragmas
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA cache_size = -64000;")  # 64MB memory cache
    conn.execute("PRAGMA temp_store = MEMORY;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    if read_only:
        conn.execute("PRAGMA query_only = ON;")
    return conn


def query(sql: str, params: Iterable[Any] | dict[str, Any] = (), read_only: bool = True) -> list[dict[str, Any]]:
    """Run a SELECT query and return rows as dictionaries."""
    conn = _connect(read_only=read_only)
    try:
        cur = conn.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def query_one(sql: str, params: Iterable[Any] | dict[str, Any] = (), read_only: bool = True) -> dict[str, Any] | None:
    """Run a SELECT query and return the first row as a dict, or None."""
    rows = query(sql, params, read_only=read_only)
    return rows[0] if rows else None


def execute(sql: str, params: Iterable[Any] | dict[str, Any] = ()) -> int:
    """Run an INSERT/UPDATE/DELETE statement and return lastrowid or rowcount."""
    conn = _connect(read_only=False)
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid or cur.rowcount
    finally:
        conn.close()


def list_tables() -> list[dict[str, Any]]:
    """Return all table names currently defined in the SQLite database."""
    return query(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )


def table_row_count(table: str) -> int:
    """Return the row count of a verified schema table."""
    allowed = {
        "pipeline_runs", "crypto_cycles", "crypto_breakouts", "crypto_breakout_dates",
        "crypto_drawdowns", "crypto_performance", "fund_holdings", "sector_weights",
        "funds", "congress_trades", "ticker_consensus", "monthly_consensus",
        "committee_signals", "committee_sectors", "politician_committees",
        "schema_version",
    }
    if table not in allowed:
        return 0
    row = query_one(f"SELECT COUNT(*) AS n FROM {table}")
    return int(row["n"]) if row else 0
