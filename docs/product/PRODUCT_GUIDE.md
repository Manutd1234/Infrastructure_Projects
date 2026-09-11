# Product Guide

How to use the NUSSIF Infrastructure Projects dashboard as a Trading Desk
Operations Engineer. This is the operator's manual.

## 1. Getting started

```bash
# 1. Make sure the database exists and has data
python database/init_db.py
python -m backend.loaders.ingest          # loads all pipeline outputs/*.csv

# 2. Run automated tests and latency benchmarks
pytest backend/tests/
python backend/bench.py

# 3. Start the API & telemetry tape
uvicorn backend.app.main:app --reload      # http://localhost:8000/docs

# 4. Start the dashboard
cd frontend && npm install && npm run dev  # http://localhost:5173
```

Open `http://localhost:5173`. You should land on the **Overview** page.

## 2. The Six Operational Surfaces

### 2.1 Overview

The landing page. Shows one card per pipeline:

| Field | Meaning |
|---|---|
| Pipeline name | `CryptoCycle`, `HedgeFund13F`, `CongressTrades` |
| Status chip | 🟢 fresh (last run < refresh policy), 🟡 stale (older), 🔴 failed |
| Last run | timestamp of the last `pipeline_runs` row |
| Rows | row count produced by the last run |
| Next scheduled | when cron will next run it |

Below the cards: real-time L1 market tape (BTC, SPY, QQQ, IWM) streamed via `/ws/telemetry` and a recent-runs audit table (last 20 across all pipelines) with
status, duration, and error message if any.

**Action:** if any chip is 🟡 or 🔴, click **Run** to trigger an asynchronous refresh
(only available if `NUSSIF_ENABLE_RUN_ENDPOINT=true` in `.env`).

### 2.2 Crypto Cycles

Five specialized quantitative subtabs:

1. **+3σ Breakout Study** — bar chart of mean forward return after +3σ
   breakouts vs. baseline, for 30/60/120/365 days. Table below with
   t-stat, p-value, and excess.
2. **Strategy Simulator** — interactive backtest simulator with configurable hold periods.
3. **Cycle Episodes (48)** — BTC price (log scale) with bull (green) / bear (red)
   shading. Hover shows cycle start/end, return, and duration.
4. **Drawdown & Recovery** — BTC vs SPY drawdown overlay. Table of top-15 deepest
   drawdowns with peak/trough/recovery dates and durations.
5. **Backtest vs B&H** — breakout strategy vs BTC buy & hold vs SPY buy &
   hold equity curves (log scale). Performance metrics table (CAGR, Sharpe, Sortino,
   max DD, win rate).

### 2.3 13F Filings

Three subtabs tracking 8 premier superinvestor hedge funds:

1. **Sector Allocation** — stacked bar of sector weights over time for the
   selected fund(s). X-axis is quarter, Y-axis is % of reported portfolio.
2. **Factor Replication** — active share ($AS \ge 0.80$) and factor decomposition.
3. **Top Holdings** — latest holdings grid with company, ticker, weight, and GICS sector.

### 2.4 Congress Trading

Three subtabs evaluating STOCK Act congressional trading signals:

1. **Macro Flows & Conflicts** — committee-aligned vs non-aligned trades by sector; table of committee × n_trades × buy/sell.
2. **CAR Event Strategy** — Fama-French Cumulative Abnormal Returns ($CAR$) surrounding disclosure dates.
3. **Trade Feed** — paginated table of recent trades, sortable and
   filterable by politician, party, ticker, chamber, date range, trade
   type, and committee alignment.

### 2.5 Scenario Stress Test (IBKR)

Interactive stress testing modeling non-linear macro factor shocks across positions:
1. **Scenarios** — predefined macroeconomic shock vectors (rate hikes, stagflation, crypto deleveraging).
2. **Tail Risk & Liquidity** — Value-at-Risk (VaR) and Expected Shortfall under stressed liquidity conditions.
3. **Asset Decomposition** — contribution to risk by asset class.

### 2.6 Database Console

A read-only SQL browser and schema explorer:

1. **Console** — SQL query input guarded by an AST syntax sandbox (rejects mutations and multi-statement injection).
2. **Schema Explorer** — schema tree showing 17 normalized tables, row counts, and column definitions.
3. **Storage Engine** — SQLite WAL mode status, memory cache size, and latency telemetry.

## 3. Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `g` then `o` | go to Overview |
| `g` then `c` | go to Crypto |
| `g` then `f` | go to Filings |
| `g` then `t` | go to Congress |
| `g` then `d` | go to Database |
| `r` | refresh current page's data |
| `?` | show shortcuts |
| `Esc` | close any open drawer / filter panel |

## 4. Triggering a Pipeline Run

1. Go to Overview.
2. Click **Run** on the pipeline you want to refresh.
3. A toast confirms the run was accepted (HTTP 202); the card's status flips to
   🟡 `RUNNING`.
4. The backend executes the pipeline in an isolated background thread and writes audit telemetry to `pipeline_runs`.
