# Current State

> Living document. Updated as work lands. Last updated: 2026-09-07.

## Status at a glance

| Component | Status | Notes |
|---|---|---|
| `CryptoBullCycle` | **Working** | Pulls BTC + SPY from yfinance, identifies cycles, runs +3σ breakout study, computes drawdowns, backtests. Outputs CSV + PNG. |
| `ThirteenFFilings` | **Working** | Scrapes Dataroma for 8 funds (2006Q4 → 2026Q2), classifies GICS sectors, plots rotation. ~95% sector coverage. |
| `CongressTrading` | **Working** | Scrapes Capitol Trades (720 trades, 39 politicians), consensus + committee signals. House.gov feasibility report written. |
| `backend/` | **Scaffold** | FastAPI app with endpoints mirroring pipeline outputs. Runs against SQLite. Not yet wired to a scheduler. |
| `frontend/` | **Scaffold** | React + TypeScript + Vite dashboard. Reads from backend API. Charts stubbed. |
| `database/` | **Scaffold** | SQLite schema for trades, holdings, sectors, signals, pipeline_runs. Init script works. |
| `notebooks/` | **Scaffold** | Example notebooks for exploratory analysis. |
| `skills/` | **Working** | Cursor agent skills for common operations. |
| `docs/` | **Working** | Full documentation set (this folder). |

## What works end-to-end today

1. Run any pipeline standalone:
   ```bash
   cd CryptoBullCycle && python main.py
   cd ThirteenFFilings && python main.py
   cd CongressTrading && python main.py
   ```
   Each writes CSV tables and PNG charts to its own `outputs/` folder.

2. Initialise the database:
   ```bash
   python database/init_db.py
   ```

3. Start the backend API:
   ```bash
   uvicorn backend.app.main:app --reload
   ```

4. Start the dashboard:
   ```bash
   cd frontend && npm install && npm run dev
   ```

## Known gaps / next work

- **Scheduler:** pipelines are run manually; no cron / Airflow / Prefect wiring yet.
- **Backend → DB:** backend currently reads pipeline `outputs/*.csv` directly;
  a loader that ingests CSVs into SQLite and serves from the DB is the next
  milestone.
- **Frontend charts:** chart components are scaffolded with sample data; need
  to wire to live backend endpoints.
- **Auth:** no authentication on the dashboard or API. Add OAuth before any
  external exposure.
- **Tests:** `product/TESTING.md` defines the strategy; coverage is currently
  limited to pipeline smoke tests.
- **Whitepaper:** Typst source is in place; needs the results section
  populated from the latest pipeline outputs.

## Recent changes

- **2026-09-07:** Reorganized the three analysis modules to the repo root
  as PascalCase folders (`CryptoBullCycle/`, `ThirteenFFilings/`,
  `CongressTrading/`), peers of the shared infrastructure. `data/` now
  holds only shared cross-task data. Added
  `ADR_2026-09-07_MODULES_AT_ROOT.md`; the earlier
  `ADR_2026-09-07_PROJECT_RESTRUCTURE.md` is superseded.
- **2026-09-07:** Restructured repository into `backend/`, `frontend/`,
  `database/`, `notebooks/`, `docs/`, `skills/`, `data/`. Added
  institutional documentation set.
- **2026-09-07:** Initial three modules (crypto cycle, 13F, congress
  trading) committed and producing outputs.

## How to update this file

Whenever you land work, update the relevant row in the status table and add
a one-line entry to **Recent changes** with today's date. Keep entries terse;
link to PRs or commits for detail.
