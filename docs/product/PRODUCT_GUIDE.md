# Product Guide

How to use the NUSSIF Infrastructure Projects dashboard as a Trading Desk
Operations Engineer. This is the operator's manual.

## 1. Getting started

```bash
# 1. Make sure the database exists and has data
python database/init_db.py
python backend/loaders/ingest.py          # loads all pipeline outputs/*.csv

# 2. Start the API
uvicorn backend.app.main:app --reload      # http://localhost:8000

# 3. Start the dashboard
cd frontend && npm install && npm run dev  # http://localhost:5173
```

Open `http://localhost:5173`. You should land on the **Overview** page.

## 2. The five surfaces

### 2.1 Overview

The landing page. Shows one card per pipeline:

| Field | Meaning |
|---|---|
| Pipeline name | `crypto_bull_cycle`, `thirteen_f_filings`, `congress_trading` |
| Status chip | 🟢 fresh (last run < refresh policy), 🟡 stale (older), 🔴 failed |
| Last run | timestamp of the last `pipeline_runs` row |
| Rows | row count produced by the last run |
| Next scheduled | when cron will next run it |

Below the cards: a recent-runs table (last 20 across all pipelines) with
status, duration, and error message if any.

**Action:** if any chip is 🟡 or 🔴, click **Run** to trigger a refresh
(only available if `enable_run_endpoint=true` in `.env`).

### 2.2 Crypto

Four panels:

1. **Cycle chart** — BTC price (log scale) with bull (green) / bear (red)
   shading. Hover shows the cycle's start/end, return, and duration.
2. **Breakout study** — bar chart of mean forward return after +3σ
   breakouts vs. baseline, for 30/60/120/365 days. Table below with
   t-stat, p-value, and excess.
3. **Drawdowns** — BTC vs SPY drawdown overlay. Table of top-15 deepest
   drawdowns with peak/trough/recovery dates.
4. **Equity curve** — breakout strategy vs BTC buy & hold vs SPY buy &
   hold (log scale). Performance metrics table (CAGR, Sharpe, Sortino,
   max DD, win rate).

**Filters:** date range, horizon selector for the breakout study.

### 2.3 Filings

Three panels:

1. **Fund selector** — pick one or more of the 8 funds; charts update.
2. **Sector rotation** — stacked bar of sector weights over time for the
   selected fund(s). X-axis is quarter, Y-axis is % of reported portfolio.
3. **Latest-quarter heatmap** — fund × sector grid with weight in each
   cell. Sortable by clicking a column.

**Filters:** fund, quarter range, sector toggle (hide sectors below a
weight threshold).

### 2.4 Congress

Four panels:

1. **Trade feed** — paginated table of recent trades, sortable and
   filterable by politician, party, ticker, chamber, date range, trade
   type, owner, and committee-aligned toggle.
2. **Consensus table** — per-ticker net signed USD, with buy/sell counts
   and a BUY/SELL/NEUTRAL flag. Sortable; click a row to see the
   underlying trades.
3. **Monthly consensus** — net signed USD by month bar chart.
4. **Committee alignment** — bar chart of aligned vs non-aligned trades by
   sector; table of committee × n_trades × buy/sell.

**Filters:** politician, party, ticker, date range, committee, aligned-only
toggle.

### 2.5 Database

A read-only SQL browser for sanity checks:

1. **Tables** — list of tables with row counts and last-modified time.
2. **Query** — a text box for `SELECT` statements only. Results capped
   at 1000 rows. The query is parsed before execution; anything that
   isn't a `SELECT` is rejected.
3. **Export** — download the current result as CSV.

This surface is for the operator; it is not a general-purpose DB admin
tool.

## 3. Keyboard shortcuts

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

## 4. Triggering a pipeline run

1. Go to Overview.
2. Click **Run** on the pipeline you want to refresh.
3. A toast confirms the run was accepted; the card's status flips to
   🟡 `RUNNING`.
4. The card polls `/ops/run/<pipeline>/status` every 5 s. When it
   succeeds, the card flips to 🟢 and the dashboard refetches the
   affected pages.
5. If it fails, the card flips to 🔴 with the error message; click the
   card to see the full `pipeline_runs` row.

Runs are async; you can navigate away while a run is in progress.

## 5. Reading the data

- **Every number on the dashboard is traceable to a CSV.** Right-click a
  chart → "View source CSV" downloads the file that produced it.
- **Stale data is labelled.** If a pipeline hasn't run in the last 24h,
  a "stale" banner appears on the relevant page.
- **Unknown sectors** are shown as `Unknown` rather than hidden — better
  to see the gap than to silently misclassify.

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Overview all 🔴 | Backend down or DB missing | `curl localhost:8000/health`; re-run `init_db.py` |
| A pipeline is 🟡 forever | Cron not running or pipeline crashing | Click the card → see the error; run the pipeline manually |
| Charts empty | Loader hasn't ingested the latest CSVs | `python backend/loaders/ingest.py` |
| "Run" button disabled | `enable_run_endpoint=false` | Set it in `.env` and restart the backend |
| `/db/query` rejects a SELECT | Parser is strict; check for trailing semicolon or comments | Remove `;` and `--` comments |

## 7. Limits

- The dashboard reflects the **last successful** pipeline run. There is
  no live data; if a pipeline is stale, you see the stale data with a
  banner.
- The DB browser is read-only and row-capped. For anything heavier, use
  the `sqlite3` CLI against `database/nussif.db`.
- "Run" is rate-limited to one concurrent run per pipeline; a second
  click is rejected with 409.
