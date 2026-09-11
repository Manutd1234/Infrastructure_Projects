# NUSSIF Infrastructure Projects

A research-and-operations platform for the National University of
Singapore Students' Investment Fund (NUSSIF). Three quantitative analysis modules
feed a high-performance FastAPI backend, a SQLite WAL store, and a React Trading Desk
dashboard with real-time WebSocket telemetry tape.

## Modules

| Folder | What it answers | Source | API key? |
|---|---|---|---|
| [`CryptoCycle/`](CryptoCycle) | Does BTC drift after +3σ weekly breakouts? How long do cycles last? | yfinance (BTC-USD, SPY) | **None** |
| [`HedgeFund13F/`](HedgeFund13F) | How do superinvestors rotate GICS sectors over 20-year cycles? | Dataroma 13F history | **None** |
| [`CongressTrades/`](CongressTrades) | Do politicians trade sectors their committees oversee? | Capitol Trades | **None** |

Massive (formerly Polygon) is optional but supported. Set `MASSIVE_API` (or `MASSIVE_API_KEY`)
in `.env` to pull live BTC/SPY quotes, prev-close aggregates, and SIC sectors from Massive; yfinance is
the automatic fallback when the key is missing. Never commit the key.

## Quickstart

```bash
# Set up virtual environment
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Initialise SQLite WAL warehouse & ingest pipeline outputs
python database/init_db.py --reset
python -m backend.loaders.ingest          # loads existing outputs/*.csv

# Optional: refresh raw data across all modules
python run_all.py
python -m backend.loaders.ingest

# Run automated tests
pytest backend/tests/

# Measure endpoint latency budget benchmarks
python backend/bench.py

# Terminal 1: Start Backend API & Telemetry Tape
uvicorn backend.app.main:app --reload     # http://localhost:8000/docs

# Terminal 2: Start Institutional Trading Desk
cd frontend && npm install && npm run dev # http://localhost:5173
```

## Architecture & Layout

```
Infrastructure_Projects/
├── CryptoCycle/           # BTC cycles, +3σ breakouts, drawdowns, backtest
├── HedgeFund13F/          # Dataroma 13F scraper, GICS classification, sector rotation
├── CongressTrades/        # Capitol Trades scraper, net consensus, committee alignment
├── backend/               # FastAPI transport layer (typed schemas, AST sandbox, WebSocket tape)
│   ├── app/
│   │   ├── api/           # crypto, filings, congress, ops, db, market, telemetry
│   │   ├── core/          # config, structured JSON logging
│   │   ├── repositories/  # SQLite WAL repository with memory cache tuning
│   │   ├── schemas/       # typed Pydantic models for OpenAPI documentation
│   │   └── services/      # business logic with explicit column projections
│   ├── loaders/           # CSV → SQLite ingestion
│   ├── tests/             # automated unit and integration test suite
│   └── bench.py           # latency benchmarking suite
├── frontend/              # Trading Desk dashboard (React + TypeScript + Vite + Tailwind)
├── database/              # SQLite WAL schema, init script, and data warehouse
├── data/                  # shared cross-module reference data
├── docs/                  # institutional docs, architecture, PRD, guides, whitepaper
├── notebooks/             # exploratory Jupyter research notebooks
├── skills/                # specialized agent skills
├── run_all.py             # multi-module batch pipeline runner
├── requirements.txt       # root requirements
├── .env.example
├── README.md
└── LICENSE
```

Shared infrastructure stays at the root. Analytics stay inside each
module. See [`docs/`](docs/) for architecture, PRD, whitepaper, and the operator guide.
