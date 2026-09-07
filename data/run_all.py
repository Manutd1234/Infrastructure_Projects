"""Run all three data pipelines in sequence.

Usage:
    python data/run_all.py
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

PIPELINES = ["crypto_bull_cycle", "thirteen_f_filings", "congress_trading"]


def run_pipeline(name: str) -> int:
    print(f"\n=== {name} ===")
    result = subprocess.run([sys.executable, "main.py"], cwd=name)
    return result.returncode


def main() -> int:
    base = Path(__file__).parent / "pipelines"
    failures = []
    for p in PIPELINES:
        rc = run_pipeline(str(base / p))
        if rc != 0:
            failures.append(p)
    print("\n=== summary ===")
    for p in PIPELINES:
        status = "FAILED" if p in failures else "ok"
        print(f"  {p}: {status}")
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
