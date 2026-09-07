"""CSV → SQLite loader.

Reads every module's outputs/*.csv and ingests it into the matching
table defined in database/schema.sql. Also writes a pipeline_runs row
per module.

The three analysis modules live at the repo root as PascalCase folders.

Usage:
    python -m backend.loaders.ingest            # ingest all
    python -m backend.loaders.ingest --pipeline CryptoBullCycle
"""

from __future__ import annotations

import argparse
import csv
import sqlite3
import time
from pathlib import Path

from backend.app.core.config import settings

PIPELINES = ["CryptoBullCycle", "ThirteenFFilings", "CongressTrading"]

# Map (module, csv_filename) -> table
CSV_TO_TABLE = {
    "CryptoBullCycle": {
        "cycles.csv": "crypto_cycles",
        "breakout_study.csv": "crypto_breakout",
        "breakout_dates.csv": "crypto_breakout_dates",
        "drawdowns.csv": "crypto_drawdowns",
        "performance.csv": "crypto_performance",
    },
    "ThirteenFFilings": {
        "holdings_with_sectors.csv": "fund_holdings",
        "sector_weights.csv": "sector_weights",
    },
    "CongressTrading": {
        "trades_with_sectors.csv": "congress_trades",
        "ticker_consensus.csv": "ticker_consensus",
        "monthly_consensus.csv": "monthly_consensus",
        "committee_summary.csv": "committee_signals",
    },
}


def _db_path() -> Path:
    return Path(settings.database_url.replace("sqlite:///", ""))


def _load_csv(path: Path) -> list[dict]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def _ingest_csv(conn: sqlite3.Connection, csv_path: Path, table: str) -> int:
    rows = _load_csv(csv_path)
    if not rows:
        return 0
    cols = list(rows[0].keys())
    placeholders = ",".join("?" * len(cols))
    sql = f"INSERT OR REPLACE INTO {table} ({','.join(cols)}) VALUES ({placeholders})"
    conn.executemany(sql, [[r.get(c) for c in cols] for r in rows])
    return len(rows)


def ingest_pipeline(pipeline: str) -> dict:
    db = _db_path()
    conn = sqlite3.connect(db)
    conn.execute("PRAGMA foreign_keys = ON")
    run_id = conn.execute(
        "INSERT INTO pipeline_runs (pipeline, status, started_at, triggered_by) VALUES (?, 'RUNNING', ?, 'loader')",
        [pipeline, time.strftime("%Y-%m-%dT%H:%M:%S")],
    ).lastrowid
    total = 0
    outputs = settings.pipelines_dir / pipeline / "outputs"
    try:
        for csv_name, table in CSV_TO_TABLE.get(pipeline, {}).items():
            path = outputs / csv_name
            if not path.exists():
                print(f"  ! missing {path}")
                continue
            n = _ingest_csv(conn, path, table)
            print(f"  {csv_name} -> {table}: {n} rows")
            total += n
        conn.execute(
            "UPDATE pipeline_runs SET status='SUCCEEDED', ended_at=?, rows_produced=? WHERE id=?",
            [time.strftime("%Y-%m-%dT%H:%M:%S"), total, run_id],
        )
        conn.commit()
    except Exception as e:
        conn.execute(
            "UPDATE pipeline_runs SET status='FAILED', ended_at=?, error=? WHERE id=?",
            [time.strftime("%Y-%m-%dT%H:%M:%S"), str(e)[:2000], run_id],
        )
        conn.commit()
        raise
    finally:
        conn.close()
    return {"pipeline": pipeline, "run_id": run_id, "rows": total}


def ingest_all() -> list[dict]:
    return [ingest_pipeline(p) for p in PIPELINES]


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--pipeline", choices=PIPELINES, default=None)
    args = ap.parse_args()
    if args.pipeline:
        print(ingest_pipeline(args.pipeline))
    else:
        for r in ingest_all():
            print(r)
