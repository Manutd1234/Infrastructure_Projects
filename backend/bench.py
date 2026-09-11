"""Latency benchmarking script for the NUSSIF backend API.

Hits every GET endpoint 100 times against the populated SQLite database
and records p50, p95, p99, min, and max latency per route.
Outputs results to docs/architecture/latency-bench.generated.json.

Usage:
    python backend/bench.py
"""

from __future__ import annotations

import json
import os
import statistics
import sys
import time
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from starlette.testclient import TestClient

from backend.app.main import app

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_PATH = REPO_ROOT / "docs" / "architecture" / "latency-bench.generated.json"

ENDPOINTS = [
    "/health",
    "/crypto/cycles",
    "/crypto/bear-markets",
    "/crypto/breakouts",
    "/crypto/breakout-dates",
    "/crypto/drawdowns",
    "/crypto/performance",
    "/crypto/equity-curve",
    "/filings/funds",
    "/filings/holdings?limit=50",
    "/filings/sector-weights",
    "/congress/trades?limit=50",
    "/congress/consensus",
    "/congress/consensus/monthly",
    "/congress/committees",
    "/ops/runs",
    "/db/tables",
    "/db/query?sql=SELECT+*+FROM+crypto_cycles+LIMIT+10",
    "/market/status",
]

ITERATIONS = 100


def run_benchmark() -> dict:
    client = TestClient(app)
    results = {}

    print(f"Running benchmark: {len(ENDPOINTS)} endpoints × {ITERATIONS} iterations...")

    # Warm-up pass
    for ep in ENDPOINTS:
        client.get(ep)

    for ep in ENDPOINTS:
        durations = []
        for _ in range(ITERATIONS):
            start = time.perf_counter()
            resp = client.get(ep)
            dur_ms = (time.perf_counter() - start) * 1000.0
            if resp.status_code == 200:
                durations.append(dur_ms)

        durations.sort()
        n = len(durations)
        p50 = durations[int(n * 0.50)]
        p95 = durations[min(int(n * 0.95), n - 1)]
        p99 = durations[min(int(n * 0.99), n - 1)]

        results[ep] = {
            "iterations": n,
            "min_ms": round(durations[0], 2),
            "p50_ms": round(p50, 2),
            "p95_ms": round(p95, 2),
            "p99_ms": round(p99, 2),
            "max_ms": round(durations[-1], 2),
            "mean_ms": round(statistics.mean(durations), 2),
        }
        print(f"  {ep:<42} p50: {p50:6.2f} ms | p95: {p95:6.2f} ms | p99: {p99:6.2f} ms")

    summary = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_endpoints": len(ENDPOINTS),
        "iterations_per_endpoint": ITERATIONS,
        "results": results,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(summary, indent=2))
    print(f"\nBenchmark results saved to: {OUTPUT_PATH}")
    return summary


if __name__ == "__main__":
    run_benchmark()
