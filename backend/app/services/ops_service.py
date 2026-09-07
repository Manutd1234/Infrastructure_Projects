"""Ops service: pipeline run management.

Triggers pipelines as subprocesses and records runs in pipeline_runs.
"""

from __future__ import annotations

import subprocess
import threading
import time
from pathlib import Path

from backend.app.core.config import settings
from backend.app.repositories.db import execute, query, query_one


def list_runs(limit: int = 50) -> list[dict]:
    return query(
        "SELECT * FROM pipeline_runs ORDER BY started_at DESC LIMIT ?",
        [limit],
    )


def get_run(run_id: int) -> dict | None:
    return query_one("SELECT * FROM pipeline_runs WHERE id = ?", [run_id])


def get_latest(pipeline: str) -> dict | None:
    return query_one(
        "SELECT * FROM pipeline_runs WHERE pipeline = ? ORDER BY started_at DESC LIMIT 1",
        [pipeline],
    )


def _run_pipeline(pipeline: str, run_id: int) -> None:
    """Execute the pipeline subprocess and update the run row. Runs in a thread."""
    pipeline_dir = settings.pipelines_dir / pipeline
    try:
        proc = subprocess.run(
            ["python", "main.py"],
            cwd=str(pipeline_dir),
            capture_output=True,
            text=True,
            timeout=settings.run_timeout_seconds,
        )
        if proc.returncode == 0:
            execute(
                "UPDATE pipeline_runs SET status='SUCCEEDED', ended_at=?, "
                "rows_produced=(SELECT COUNT(*) FROM congress_trades) "
                "WHERE id=?",
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
    """Insert a RUNNING row and start the pipeline in a background thread."""
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
    row = get_latest(pipeline)
    return bool(row and row["status"] == "RUNNING")
