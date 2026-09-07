"""CSV → SQLite loader.

Reads each module's outputs/*.csv and ingests only the columns that exist
in database/schema.sql. Extra CSV columns are dropped; missing optional
columns are left NULL. Wide performance.csv is pivoted to long form.

Usage:
    python -m backend.loaders.ingest
    python -m backend.loaders.ingest --pipeline CryptoCycle
"""

from __future__ import annotations

import argparse
import csv
import sqlite3
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

PIPELINES = ["CryptoCycle", "HedgeFund13F", "CongressTrades"]

FUNDS = {
    "psc": "Bill Ackman - Pershing Square Capital Management",
    "VFC": "Valley Forge Capital Management",
    "AM": "David Tepper - Appaloosa Management",
    "AC": "Chuck Akre - Akre Capital Management",
    "BRK": "Warren Buffett - Berkshire Hathaway",
    "HC": "Li Lu - Himalaya Capital Management",
    "tci": "Chris Hohn - TCI Fund Management",
    "DA": "Pat Dorsey - Dorsey Asset Management",
}

CSV_TO_TABLE = {
    "CryptoCycle": {
        "cycles.csv": "crypto_cycles",
        "breakout_study.csv": "crypto_breakouts",
        "breakout_dates.csv": "crypto_breakout_dates",
        "drawdowns.csv": "crypto_drawdowns",
        "performance.csv": "crypto_performance",
    },
    "HedgeFund13F": {
        "holdings_with_sectors.csv": "fund_holdings",
        "sector_weights.csv": "sector_weights",
    },
    "CongressTrades": {
        "trades_with_sectors.csv": "congress_trades",
        "ticker_consensus.csv": "ticker_consensus",
        "monthly_consensus.csv": "monthly_consensus",
        "committee_summary.csv": "committee_signals",
    },
}

COLUMN_ALIASES = {
    "date": "signal_date",
    "horizon_days": "horizon",
}

PERF_METRIC_MAP = {
    "Total Return": "total_return",
    "CAGR": "cagr",
    "Volatility (ann.)": "volatility_ann",
    "Sharpe": "sharpe",
    "Sortino": "sortino",
    "Max Drawdown": "max_drawdown",
    "Drawdown Trough": "drawdown_trough",
    "Drawdown Recovery": "drawdown_recovery",
    "Win Rate": "win_rate",
    "Win Rate (invested)": "win_rate_invested",
    "Num Trades": "num_trades",
    "Final Equity": "final_equity",
}

TABLE_COLUMNS: dict[str, set[str]] = {
    "crypto_cycles": {
        "type", "start_date", "end_date", "start_price", "end_price",
        "return", "duration_days", "run_id",
    },
    "crypto_breakouts": {
        "horizon", "n_breakouts", "mean_breakout", "median_breakout",
        "pct_positive", "mean_all", "t_stat", "p_value", "excess_vs_all", "run_id",
    },
    "crypto_breakout_dates": {"signal_date", "run_id"},
    "crypto_drawdowns": {
        "peak_date", "trough_date", "recovery_date", "max_drawdown",
        "peak_to_trough_days", "recovery_days", "run_id",
    },
    "crypto_performance": {
        "strategy", "total_return", "cagr", "volatility_ann", "sharpe",
        "sortino", "max_drawdown", "drawdown_trough", "drawdown_recovery",
        "win_rate", "win_rate_invested", "num_trades", "final_equity", "run_id",
    },
    "fund_holdings": {
        "fund", "quarter", "quarter_label", "portfolio_value", "rank",
        "ticker", "company", "weight", "sector", "run_id",
    },
    "sector_weights": {"fund", "quarter", "sector", "weight", "run_id"},
    "congress_trades": {
        "trade_id", "politician_id", "politician", "party", "chamber", "state",
        "issuer", "ticker", "published", "traded", "filed_after_days", "owner",
        "trade_type", "size_raw", "size_low_usd", "size_high_usd", "price",
        "sector", "committee_aligned", "matching_committees", "run_id",
    },
    "ticker_consensus": {
        "ticker", "issuer", "sector", "n_trades", "n_buy", "n_sell",
        "net_signed_usd", "n_politicians", "buy_pct", "consensus", "run_id",
    },
    "monthly_consensus": {
        "month", "n_trades", "n_buy", "n_sell", "net_signed_usd",
        "buy_share", "run_id",
    },
    "committee_signals": {
        "committee", "n_trades", "n_buy", "n_sell", "n_politicians",
        "total_size_low_usd", "run_id",
    },
}


def _db_path() -> Path:
    return REPO_ROOT / "database" / "nussif.db"


def _load_csv(path: Path) -> list[dict]:
    with path.open(newline="") as f:
        return list(csv.DictReader(f))


def _pivot_performance(rows: list[dict]) -> list[dict]:
    """Convert wide metric×strategy CSV into one row per strategy."""
    if not rows:
        return rows
    first = rows[0]
    if "strategy" in first:
        return rows
    strategies = [k for k in first.keys() if k and k != ""]
    metric_key = next((k for k in first.keys() if k == "" or k is None), None)
    # DictReader uses the first header cell; unnamed index is often ""
    out: list[dict] = []
    for strategy in strategies:
        rec: dict[str, object] = {"strategy": strategy}
        for row in rows:
            raw_metric = row.get(metric_key or "", "") or row.get("", "")
            col = PERF_METRIC_MAP.get(raw_metric)
            if col:
                rec[col] = row.get(strategy)
        out.append(rec)
    return out


def _normalise_row(row: dict, table: str, run_id: int) -> dict:
    mapped = {COLUMN_ALIASES.get(k, k): v for k, v in row.items() if k is not None}
    allowed = TABLE_COLUMNS[table]
    cleaned = {k: (v if v != "" else None) for k, v in mapped.items() if k in allowed}
    cleaned["run_id"] = run_id
    return cleaned


def _table_cols(conn: sqlite3.Connection, table: str) -> list[str]:
    return [r[1] for r in conn.execute(f"PRAGMA table_info({table})").fetchall()]


def _ingest_csv(conn: sqlite3.Connection, csv_path: Path, table: str, run_id: int) -> int:
    rows = _load_csv(csv_path)
    if table == "crypto_performance":
        rows = _pivot_performance(rows)
    if not rows:
        return 0
    prepared = [_normalise_row(r, table, run_id) for r in rows]
    db_cols = set(_table_cols(conn, table))
    cols = [c for c in prepared[0].keys() if c in db_cols]
    conn.execute(f"DELETE FROM {table}")
    placeholders = ",".join("?" * len(cols))
    sql = f"INSERT OR REPLACE INTO {table} ({','.join(cols)}) VALUES ({placeholders})"
    conn.executemany(sql, [[r.get(c) for c in cols] for r in prepared])
    return len(prepared)


def _seed_funds(conn: sqlite3.Connection) -> None:
    conn.executemany(
        "INSERT OR REPLACE INTO funds (code, name) VALUES (?, ?)",
        list(FUNDS.items()),
    )


def ingest_pipeline(pipeline: str) -> dict:
    db = _db_path()
    conn = sqlite3.connect(db)
    conn.execute("PRAGMA foreign_keys = ON")
    run_id = conn.execute(
        "INSERT INTO pipeline_runs (pipeline, status, started_at, triggered_by) "
        "VALUES (?, 'RUNNING', ?, 'loader')",
        [pipeline, time.strftime("%Y-%m-%dT%H:%M:%S")],
    ).lastrowid
    total = 0
    outputs = REPO_ROOT / pipeline / "outputs"
    try:
        for csv_name, table in CSV_TO_TABLE.get(pipeline, {}).items():
            path = outputs / csv_name
            if not path.exists():
                print(f"  ! missing {path}")
                continue
            n = _ingest_csv(conn, path, table, int(run_id))
            print(f"  {csv_name} -> {table}: {n} rows")
            total += n
        if pipeline == "HedgeFund13F":
            _seed_funds(conn)
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
