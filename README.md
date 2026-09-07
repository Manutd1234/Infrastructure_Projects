# NUSSIF Infrastructure Projects

A research-and-operations platform for the National University of
Singapore Students' Investment Fund (NUSSIF). Three analysis modules
feed a FastAPI backend, a SQLite store, and a React Trading Desk
dashboard.

## Modules

| Folder | What it answers | Source | API key? |
|---|---|---|---|
| [`CryptoCycle/`](CryptoCycle) | Does BTC drift after +3σ weekly breakouts? How long do cycles last? | yfinance (BTC-USD, SPY) | **None** |
| [`HedgeFund13F/`](HedgeFund13F) | How do superinvestors rotate GICS sectors? | Dataroma 13F history | **None** |
| [`CongressTrades/`](CongressTrades) | Do politicians trade sectors their committees oversee? | Capitol Trades | **None** |

No paid market-data or LLM keys are required. Copy `.env.example` to
`.env` if you want to change ports or enable dashboard-triggered runs.

## Quickstart

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

python database/init_db.py --reset
python -m backend.loaders.ingest          # loads existing outputs/*.csv

# optional: refresh raw data (uses public HTML / yfinance, no keys)
python run_all.py
python -m backend.loaders.ingest

# terminal 1
uvicorn backend.app.main:app --reload     # http://localhost:8000/docs

# terminal 2
cd frontend && npm install && npm run dev # http://localhost:5173
```

## Layout

```
Infrastructure_Projects/
├── CryptoCycle/           # BTC cycles, breakouts, drawdowns, backtest
├── HedgeFund13F/          # Dataroma 13F scraper + sector rotation
├── CongressTrades/        # Capitol Trades + consensus + committees
├── backend/               # FastAPI transport (no analytics)
├── frontend/              # Trading Desk dashboard
├── database/              # SQLite schema + init
├── data/                  # shared cross-module data only
├── docs/
├── notebooks/
├── skills/
├── run_all.py
├── requirements.txt
├── .env.example
├── README.md
└── LICENSE
```

Shared infrastructure stays at the root. Analytics stay inside each
module. See [`docs/`](docs/) for architecture, PRD, and the operator guide.
