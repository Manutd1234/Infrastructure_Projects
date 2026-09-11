# Architecture

## 1. Overview

NUSSIF Infrastructure Projects is a **research-and-operations platform**
that turns three independent quantitative data pipelines into a single, dashboard-driven
trading-desk experience. The system is designed for a single operator (a
"Trading Desk Operations Engineer") who needs to monitor data freshness,
inspect signals, and replay analyses without writing code.

```
                ┌──────────────────────────────────────────────┐
                │               Trading Desk Dashboard           │
                │            (frontend — React + Vite)           │
                └───────────────────────┬──────────────────────┘
                                        │ HTTPS / JSON & WebSockets
                ┌───────────────────────▼──────────────────────┐
                │              Backend API (FastAPI)            │
                │  /crypto /filings /congress /ops /db /market │
                │               /ws/telemetry                  │
                └───────┬──────────┬──────────┬──────────┬──────┘
                        │          │          │          │
              ┌─────────▼┐  ┌──────▼─────┐  ┌──▼────────┐  ┌▼─────────┐
              │  Crypto  │  │ HedgeFund  │  │  Congress │  │  SQLite  │
              │  Cycle   │  │    13F     │  │   Trades  │  │   (WAL)  │
              │          │  │            │  │           │  │          │
              └────┬─────┘  └─────┬──────┘  └─────┬─────┘  └────┬─────┘
                   │              │               │            │
              ┌────▼──────────────▼───────────────▼────┐  ┌────▼─────┐
              │   External data sources              │  │  outputs/ │
              │   yfinance · Dataroma · Capitol Trades │  │  CSV+PNG │
              │   Massive (prev-close L1 feeds)        │  │          │
              └──────────────────────────────────────┘  └──────────┘
```

## 2. Components

### 2.1 Analysis modules (repo root)

Three self-contained Python packages at the repo root, each with the
same shape:

```
<Module>/                 # CryptoCycle | HedgeFund13F | CongressTrades
├── README.md          # methodology + empirical results
├── requirements.txt
├── main.py            # execution entry point
├── *.py               # quantitative calculation modules
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
structured CSVs (consumed by the backend loader) and PNGs (consumed by the
dashboard and the whitepaper).

### 2.2 Backend (`backend/`)

A FastAPI application that exposes pipeline outputs as a typed JSON API and WebSocket stream.
See `DATA_OPS_BACKEND.md` for the full design.

- **Reads** from `database/nussif.db` using SQLite WAL mode with 64MB memory caching.
- **Writes** run metadata to `pipeline_runs` (start, end, status, row counts).
- **Routes:** `/crypto/*`, `/filings/*`, `/congress/*`, `/ops/*`, `/db/*`, `/market/*`, `/ws/telemetry`,
  `/health`, `/health/ready`, `/metrics`. Dual mounts support `/api/*` prefixes seamlessly.
- **AST Security Guardrail:** Analyzes `/db/query` statements to reject mutations, multi-statement injections, or non-SELECT expressions.
- **No business logic** — the backend is a thin transport layer. All
  quantitative analytics live in the root modules.

### 2.3 Database (`database/`)

SQLite WAL store by default (`database/nussif.db`). Schema is
defined in `database/schema.sql` and materialised by `database/init_db.py`.

Core tables:

| Table | Grain | Purpose |
|---|---|---|
| `pipeline_runs` | one row per pipeline execution | freshness / ops monitoring |
| `crypto_cycles` | one row per bull/bear cycle | cycle history |
| `crypto_breakouts` | one row per +3σ breakout horizon | breakout drift study |
| `crypto_breakout_dates` | one row per breakout date | breakout timing signal |
| `crypto_drawdowns` | one row per drawdown episode | stress-test view |
| `crypto_performance` | one row per strategy | backtest comparison metrics |
| `fund_holdings` | fund × quarter × ticker | 13F holdings history |
| `sector_weights` | fund × quarter × sector | GICS rotation tracking |
| `funds` | one row per tracked fund | fund registry |
| `congress_trades` | one row per trade | raw disclosures |
| `ticker_consensus` | one row per ticker | consensus signal (net signed USD) |
| `monthly_consensus` | one row per month | aggregate volume sentiment |
| `committee_signals` | one row per committee | jurisdictional alignment signal |

See `database/schema.sql` for DDL.

### 2.4 Frontend (`frontend/`)

React + TypeScript + Vite + Tailwind. The dashboard is organised around the
six operational surfaces an institutional desk engineer operates:

1. **Overview** — pipeline health telemetry, L1 market prices, row counts, and real-time audit logs.
2. **Crypto Cycles** — 5 subtabs (`+3σ Breakout Study`, `Strategy Simulator`, `Cycle Episodes (48)`, `Drawdown & Recovery`, `Backtest vs B&H`).
3. **13F Filings** — 3 subtabs (`Sector Allocation`, `Factor Replication`, `Top Holdings`) tracking 8 premier hedge funds.
4. **Congress Trading** — 3 subtabs (`Macro Flows & Conflicts`, `CAR Event Strategy`, `Trade Feed`) evaluating STOCK Act alpha.
5. **Scenario Stress Test (IBKR)** — 3 subtabs (`Scenarios`, `Tail Risk & Liquidity`, `Asset Decomposition`) modeling non-linear macro factor shocks.
6. **Database Console** — 3 subtabs (`Console`, `Schema`, `Storage Engine`) with AST read-only sandboxing and harmonized Schema Explorer.

### 2.5 Institutional Whitepaper (`docs/whitepaper/`)

A 14-page publication-grade institutional research monograph (`NUSSIF_Infrastructure_Projects_Whitepaper.pdf`) compiled via native Typst, providing mathematical formalisms, Markov regime switching equations, Fama-French CAR event study proofs, and non-linear Taylor expansion models.

### 2.6 Notebooks (`notebooks/`)

Jupyter notebooks for exploratory analysis that doesn't belong in a
production pipeline: ad-hoc studies, one-off charts, hypothesis checks.
Notebooks are version-controlled but **not** loaded by the backend.

### 2.7 Skills (`skills/`)

Cursor/Antigravity agent skills that encode operational runbooks so
the AI assistant can run pipelines, refresh data, and generate reports
without being told the steps each time.

## 3. Design Principles

1. **Pipelines are the source of truth.** All analytics are computed in the
   pipelines and serialised to CSV. The backend never recomputes; it only
   serves. This keeps the analytics reproducible and testable.
2. **Idempotent and cacheable.** Every pipeline can be re-run safely. Network
   fetches are cached to `cache/`; deleting the cache is the supported way
   to force a refresh.
3. **No business logic in the backend or frontend.** They are transport and
   presentation layers. This prevents the classic "logic smeared across three
   tiers" anti-pattern.
4. **SQLite WAL first, Postgres-ready.** The schema is portable; swapping to
   Postgres only requires changing the connection string and a few column
   types. WAL mode ensures concurrency without reader/writer contention.
5. **Observable by default.** Every pipeline run writes a `pipeline_runs`
   row; the dashboard's Overview page reads it. If a pipeline is stale, the
   operator sees it immediately.
6. **Strictly typed contracts.** FastAPI endpoints validate via Pydantic response models,
   ensuring contract fidelity with TypeScript clients.
7. **Documentation lives with code.** This `docs/` tree is versioned with
   the implementation; ADRs record *why* decisions were made.

## 4. Boundaries and Contracts

- **Pipeline → Backend:** CSV files in `outputs/` with documented schemas
  (see `DATA_PROCESSING_FLOW.md`). The backend loader ingests them into SQLite.
- **Backend → Frontend:** JSON over HTTP and WebSocket telemetry. OpenAPI spec at `/docs`.
- **Backend → Database:** SQL with explicit column projections. Read queries run in read-only mode.
- **Operator → Dashboard:** a single human operating through the UI — never directly against the DB.

## 5. Non-goals

- This is **not** a trading execution system. It does not place orders or route orders to brokers. It is a research and operations monitoring tool.
- It is **not** multi-tenant. One deployment serves one institutional operator desk.
