"""SQLite repository — thin SQL helpers for the services layer."""

from __future__ import annotations

import sqlite3
from typing import Any, Iterable

from backend.app.core.config import settings


def _connect() -> sqlite3.Connection:
    # Strip sqlite:/// prefix
    path = settings.database_url.replace("sqlite:///", "")
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def query(sql: str, params: Iterable[Any] | dict[str, Any] = ()) -> list[dict]:
    """Run a SELECT and return rows as dicts."""
    conn = _connect()
    try:
        cur = conn.execute(sql, params)
        return [dict(r) for r in cur.fetchall()]
    finally:
        conn.close()


def query_one(sql: str, params: Iterable[Any] | dict[str, Any] = ()) -> dict | None:
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql: str, params: Iterable[Any] | dict[str, Any] = ()) -> int:
    """Run an INSERT/UPDATE/DELETE and return lastrowid / rowcount."""
    conn = _connect()
    try:
        cur = conn.execute(sql, params)
        conn.commit()
        return cur.lastrowid or cur.rowcount
    finally:
        conn.close()


def list_tables() -> list[dict]:
    return query(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    )


def table_row_count(table: str) -> int:
    # table is from our own schema, but validate it's a known name
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
