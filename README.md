# NUSSIF Infrastructure Projects

A research-and-operations platform maintained by the National University
of Singapore Students' Investment Fund (NUSSIF). It combines three
quantitative data pipelines with a FastAPI backend, a SQLite database,
and a React "Trading Desk Operations" dashboard.

## What it does

| Surface | What it gives you |
|---|---|
| **Analysis modules** (`CryptoBullCycle/`, `ThirteenFFilings/`, `CongressTrading/`) | BTC cycle + breakout study, 13F filings sector rotation, congress trading consensus + committee signals |
| **Backend** (`backend/`) | FastAPI serving module outputs as typed JSON |
| **Database** (`database/`) | SQLite store mirroring the module CSV contracts |
| **Frontend** (`frontend/`) | React dashboard for a Trading Desk Operations Engineer |
| **Notebooks** (`notebooks/`) | Exploratory analysis |
| **Docs** (`docs/`) | Institutional documentation set |
| **Skills** (`skills/`) | Cursor agent skills for common operations |

## Quickstart

```bash
# 1. Python environment
python -m venv .venv && source .venv/bin/activate
pip install -r backend/requirements.txt
pip install -r data/pipelines/*/requirements.txt

# 2. Database
python database/init_db.py

# 3. Run modules and load their outputs into the DB
python run_all.py
python -m backend.loaders.ingest

# 4. Backend (terminal 1)
uvicorn backend.app.main:app --reload

# 5. Frontend (terminal 2)
cd frontend && npm install && npm run dev   # http://localhost:5173
```

OpenAPI docs at `http://localhost:8000/docs`.

## Repository layout

```
Infrastructure_Projects/
├── CryptoBullCycle/              # task 1 — BTC cycles, +3σ breakout study, drawdowns, backtest
├── ThirteenFFilings/             # task 3 — Dataroma 13F scraper, GICS sectors, rotation charts
├── CongressTrading/              # task 4 — Capitol Trades scraper, consensus, committee signals
├── backend/                      # shared FastAPI transport (no analytics)
│   ├── app/
│   ├── loaders/                  # CSV → SQLite
│   └── requirements.txt
├── frontend/                     # shared React + TS + Vite dashboard
│   ├── src/
│   └── package.json
├── database/                     # shared SQLite schema + init
│   ├── schema.sql
│   └── init_db.py
├── data/                         # shared cross-task data (not module-specific)
├── notebooks/                    # exploratory analysis
├── docs/                         # institutional documentation
│   ├── architecture/
│   ├── engineering/
│   ├── planning/
│   ├── product/
│   └── whitepaper/
├── skills/                       # Cursor agent skills
├── run_all.py                    # run all three modules
├── .env.example
├── README.md
├── LICENSE
└── .gitignore
```

## Documentation

Start in [`docs/`](docs/):

- [`docs/README.md`](docs/README.md) — documentation map
- [`docs/CURRENT_STATE.md`](docs/CURRENT_STATE.md) — live status
- [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) — system design
- [`docs/planning/PRD.md`](docs/planning/PRD.md) — product requirements
- [`docs/product/PRODUCT_GUIDE.md`](docs/product/PRODUCT_GUIDE.md) — operator's manual

## Shared conventions

- **Modules are the source of truth.** All analytics live in
  `CryptoBullCycle/`, `ThirteenFFilings/`, and `CongressTrading/`; the
  backend and frontend are transport and presentation only.
- **Idempotent and cacheable.** Every module can be re-run safely.
  Network fetches are cached to `<Module>/cache/` (gitignored); deleting
  the cache forces a fresh pull.
- **GICS sectors** throughout (Technology, Financials, Healthcare,
  Consumer Discretionary, Consumer Staples, Communication Services,
  Industrials, Energy, Materials, Real Estate, Utilities).
- **SQLite first, Postgres-ready.** The schema is portable; swapping
  only requires the connection string and a few column types.
- **Python 3.10+** for pipelines and backend; **Node 18+** for frontend.
- **No author attributions** in code or docs; history is in `git log`.

## The three modules

| Module | Source | Question |
|---|---|---|
| `CryptoBullCycle` | yfinance (BTC-USD, SPY) | Does BTC drift up after +3σ weekly breakouts? How long do cycles last and what are the drawdowns? |
| `ThirteenFFilings` | Dataroma (8 funds) | How do superinvestors rotate sectors across quarters, and where are they concentrated today? |
| `CongressTrading` | Capitol Trades | Do politicians trade sectors their committees oversee? What is the per-ticker consensus? |

See each module's `README.md` for methodology and headline results.
