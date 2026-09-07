# Architecture

## 1. Overview

NUSSIF Infrastructure Projects is a **research-and-operations platform**
that turns three independent data pipelines into a single, dashboard-driven
trading-desk experience. The system is designed for a single operator (a
"Trading Desk Operations Engineer") who needs to monitor data freshness,
inspect signals, and replay analyses without writing code.

```
                ┌──────────────────────────────────────────────┐
                │               Trading Desk Dashboard           │
                │            (frontend — React + Vite)           │
                └───────────────────────┬──────────────────────┘
                                        │ HTTPS / JSON
                ┌───────────────────────▼──────────────────────┐
                │              Backend API (FastAPI)            │
                │   /crypto  /filings  /congress  /ops  /db     │
                └───────┬──────────┬──────────┬──────────┬──────┘
                        │          │          │          │
              ┌─────────▼┐  ┌──────▼─────┐  ┌──▼────────┐  ┌▼─────────┐
              │ crypto_  │  │ thirteen_ │  │ congress_ │  │  SQLite  │
              │ bull_    │  │ f_filings  │  │ trading  │  │ database │
              │ cycle    │  │            │  │           │  │          │
              └────┬─────┘  └─────┬──────┘  └─────┬─────┘  └────┬─────┘
                   │              │               │            │
              ┌────▼──────────────▼───────────────▼────┐  ┌────▼─────┐
              │   External data sources              │  │  outputs/ │
              │   yfinance · Dataroma · Capitol Trades │  │  CSV+PNG │
              └──────────────────────────────────────┘  └──────────┘
```

## 2. Components

### 2.1 Analysis modules (repo root)

Three self-contained Python packages at the repo root, each with the
same shape:

```
<Module>/                 # CryptoCycle | HedgeFund13F | CongressTrades
├── README.md          # methodology + results
├── requirements.txt
├── main.py            # entry point
├── *.py               # module-specific modules
├── cache/             # raw HTML / price cache (gitignored)
└── outputs/           # generated CSV + PNG (committed)
```

| Module | Source | Output |
|---|---|---|
| `CryptoCycle` | yfinance (BTC-USD, SPY) | cycles, bear_markets, drawdowns, breakout_study, performance, equity_curve, correlation |
| `HedgeFund13F` | Dataroma (8 funds) | holdings, sector_weights, rotation charts, heatmap |
| `CongressTrades` | Capitol Trades | trades, ticker_consensus, monthly_consensus, committee_summary, rotation charts |

Each module is **idempotent**: re-running with the cache present only
re-processes; deleting `cache/` forces a fresh pull. Modules write
structured CSVs (consumed by the backend) and PNGs (consumed by the
dashboard and the whitepaper).

### 2.2 Backend (`backend/`)

A FastAPI application that exposes the pipeline outputs as a typed JSON API.
See `DATA_OPS_BACKEND.md` for the full design.

- **Reads** from `*/outputs/*.csv` and from the SQLite
  database.
- **Writes** run metadata to `pipeline_runs` (start, end, status, row counts).
- **Routes:** `/crypto/*`, `/filings/*`, `/congress/*`, `/ops/*`, `/db/*`,
  `/health`.
- **No business logic** — the backend is a thin transport layer. All
  analytics live in the pipelines.

### 2.3 Database (`database/`)

SQLite by default (zero-ops, file at `database/nussif.db`). Schema is
defined in `database/schema.sql` and materialised by `database/init_db.py`.

Core tables:

| Table | Grain | Purpose |
|---|---|---|
| `pipeline_runs` | one row per pipeline execution | freshness / ops monitoring |
| `crypto_cycles` | one row per bull/bear cycle | cycle history |
| `crypto_breakouts` | one row per +3σ breakout date | breakout drift study |
| `crypto_drawdowns` | one row per drawdown episode | stress-test view |
| `fund_holdings` | fund × quarter × ticker | 13F history |
| `sector_weights` | fund × quarter × sector | rotation |
| `congress_trades` | one row per trade | raw trades |
| `ticker_consensus` | one row per ticker | consensus signal |
| `committee_signals` | one row per committee × sector | relevance signal |

See `database/schema.sql` for DDL.

### 2.4 Frontend (`frontend/`)

React + TypeScript + Vite + Tailwind. The dashboard is organised around the
five operational surfaces a Trading Desk Operations Engineer needs:

1. **Overview** — pipeline health, last-run times, row counts, errors.
2. **Crypto** — cycle chart, breakout table, drawdown chart, BTC vs SPY.
3. **Filings** — sector rotation, fund heatmap, latest-quarter table.
4. **Congress** — trade feed, consensus table, committee alignment.
5. **Database** — raw table browser with filters.

See `product/PRODUCT_GUIDE.md` for the user-facing guide.

### 2.5 Notebooks (`notebooks/`)

Jupyter notebooks for exploratory analysis that doesn't belong in a
production pipeline: ad-hoc studies, one-off charts, hypothesis checks.
Notebooks are version-controlled but **not** loaded by the backend.

### 2.6 Skills (`skills/`)

Cursor agent skills (`SKILL.md` files) that encode operational runbooks so
the AI assistant can run pipelines, refresh data, and generate reports
without being told the steps each time.

## 3. Design principles

1. **Pipelines are the source of truth.** All analytics are computed in the
   pipelines and serialised to CSV. The backend never recomputes; it only
   serves. This keeps the analytics reproducible and testable.
2. **Idempotent and cacheable.** Every pipeline can be re-run safely. Network
   fetches are cached to `cache/`; deleting the cache is the supported way
   to force a refresh.
3. **No business logic in the backend or frontend.** They are transport and
   presentation layers. This prevents the classic "logic smeared across three
   tiers" anti-pattern.
4. **SQLite first, Postgres-ready.** The schema is portable; swapping to
   Postgres only requires changing the connection string and a few column
   types.
5. **Observable by default.** Every pipeline run writes a `pipeline_runs`
   row; the dashboard's Overview page reads it. If a pipeline is stale, the
   operator sees it immediately.
6. **Documentation lives with code.** This `docs/` tree is versioned with
   the implementation; ADRs record *why* decisions were made.

## 4. Boundaries and contracts

- **Pipeline → Backend:** CSV files in `outputs/` with documented schemas
  (see `DATA_PROCESSING_FLOW.md`). The backend treats these as read-only.
- **Backend → Frontend:** JSON over HTTP. OpenAPI spec at `/docs`. The
  frontend is generated against the spec so contracts can't drift.
- **Backend → Database:** SQL. The backend owns all DB writes; pipelines
  write CSVs and a separate loader (`backend/loaders/`) ingests them.
- **Operator → Dashboard:** a single human, authenticated (when exposed
  externally), operating through the UI — never directly against the DB.

## 5. Non-goals

- This is **not** a trading system. It does not place orders, manage
  positions, or connect to a broker. It is a research and monitoring tool.
- It is **not** multi-tenant. One deployment serves one operator.
- It does **not** do real-time streaming. All data is batch-processed on a
  schedule (cron / manual for now; Airflow or Prefect later).
