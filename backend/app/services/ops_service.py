"""Ops service: pipeline execution and monitoring.

Triggers pipelines as isolated subprocesses and records execution metadata in pipeline_runs.
All database operations use explicit column projections per institutional standards.
"""

from __future__ import annotations

import subprocess
import sys
import threading
import time
from typing import Any

from backend.app.core.config import settings
from backend.app.repositories.db import execute, query, query_one


def list_runs(limit: int = 50) -> list[dict[str, Any]]:
    """Return recent pipeline execution history.

    Args:
        limit: Max number of run rows to return.

    Returns:
        List of execution run records sorted newest first.
    """
    return query(
        "SELECT id, pipeline, status, started_at, ended_at, rows_produced, error, triggered_by "
        "FROM pipeline_runs ORDER BY started_at DESC LIMIT ?",
        [limit],
    )


def get_run(run_id: int) -> dict[str, Any] | None:
    """Return a single pipeline run by its unique identifier.

    Args:
        run_id: Pipeline run integer identifier.

    Returns:
        Run dictionary or None if not found.
    """
    return query_one(
        "SELECT id, pipeline, status, started_at, ended_at, rows_produced, error, triggered_by "
        "FROM pipeline_runs WHERE id = ?",
        [run_id],
    )


def get_latest(pipeline: str) -> dict[str, Any] | None:
    """Return the most recent execution run for a given pipeline module.

    Args:
        pipeline: Pipeline module name ('CryptoCycle', 'HedgeFund13F', 'CongressTrades').

    Returns:
        Most recent run dictionary or None.
    """
    return query_one(
        "SELECT id, pipeline, status, started_at, ended_at, rows_produced, error, triggered_by "
        "FROM pipeline_runs WHERE pipeline = ? ORDER BY started_at DESC LIMIT 1",
        [pipeline],
    )


def _run_pipeline(pipeline: str, run_id: int) -> None:
    """Execute the pipeline subprocess and update the run row. Runs asynchronously in a thread."""
    pipeline_dir = settings.pipelines_dir / pipeline
    table_map = {
        "CryptoCycle": "crypto_cycles",
        "HedgeFund13F": "sector_weights",
        "CongressTrades": "congress_trades",
    }
    target_table = table_map.get(pipeline, "pipeline_runs")

    try:
        proc = subprocess.run(
            [sys.executable, "main.py"],
            cwd=str(pipeline_dir),
            capture_output=True,
            text=True,
            timeout=settings.run_timeout_seconds,
        )
        if proc.returncode == 0:
            execute(
                f"UPDATE pipeline_runs SET status='SUCCEEDED', ended_at=?, "
                f"rows_produced=(SELECT COUNT(*) FROM {target_table}) "
                f"WHERE id=?",
                [time.strftime("%Y-%m-%dT%H:%M:%S"), run_id],
            )
        else:
            err = (proc.stderr or proc.stdout or "")[:2000]
            execute(
                "UPDATE pipeline_runs SET status='FAILED', ended_at=?, error=? WHERE id=?",
                [time.strftime("%Y-%m-%dT%H:%M:%S"), err, run_id],
            )
    except subprocess.TimeoutExpired:
        execute(
            "UPDATE pipeline_runs SET status='FAILED', ended_at=?, error='timeout' WHERE id=?",
            [time.strftime("%Y-%m-%dT%H:%M:%S"), run_id],
        )
    except Exception as e:
        execute(
            "UPDATE pipeline_runs SET status='FAILED', ended_at=?, error=? WHERE id=?",
            [time.strftime("%Y-%m-%dT%H:%M:%S"), str(e)[:2000], run_id],
        )


def trigger(pipeline: str, triggered_by: str = "manual") -> int:
    """Insert a RUNNING row and launch the pipeline in a background thread.

    Args:
        pipeline: Target pipeline name to execute.
        triggered_by: Originator identifier ('manual', 'dashboard', 'cron').

    Returns:
        Generated run_id integer.
    """
    run_id = execute(
        "INSERT INTO pipeline_runs (pipeline, status, started_at, triggered_by) "
        "VALUES (?, 'RUNNING', ?, ?)",
        [pipeline, time.strftime("%Y-%m-%dT%H:%M:%S"), triggered_by],
    )
    thread = threading.Thread(
        target=_run_pipeline, args=(pipeline, run_id), daemon=True
    )
    thread.start()
    return int(run_id)


def is_busy(pipeline: str) -> bool:
    """Check if a pipeline is currently executing."""
    row = get_latest(pipeline)
    return bool(row and row.get("status") == "RUNNING")
