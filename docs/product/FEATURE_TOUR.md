# Feature Tour

A walkthrough of the dashboard, one feature at a time. Read alongside
`PRODUCT_GUIDE.md` (the how-to) — this document is the *what* and *why*.

## 1. Overview page

**What:** A single screen showing the health of all three pipelines.
**Why:** The operator's first question is always "is the data fresh?". This
page answers it in under 10 seconds without scrolling.
**Components:**
- Pipeline status cards (3) with traffic-light chips.
- Recent-runs table (last 20) with status, duration, and error.
- "Run" button per pipeline (gated).

## 2. Crypto page

### 2.1 Cycle chart
**What:** BTC price on a log scale, with bull (green) and bear (red)
shaded bands marking each cycle.
**Why:** The cycle identification is the foundation of the crypto study;
showing it on the price chart lets the operator eyeball whether the
algorithm's peaks and troughs match reality.
**Inputs:** `cycles.csv` from `crypto_bull_cycle`.

### 2.2 Breakout study
**What:** Grouped bars of mean forward return after +3σ breakouts vs. the
unconditional baseline, for 30/60/120/365-day horizons. A table below shows
n_breakouts, t-stat, p-value, excess.
**Why:** The core hypothesis of the crypto project is that BTC drifts up
after +3σ weekly breakouts. The chart makes the directional signal
visible; the table makes the statistical strength (or weakness) honest.
**Inputs:** `breakout_study.csv`, `breakout_dates.csv`.

### 2.3 Drawdowns
**What:** BTC and SPY drawdown series overlaid, with a table of the top-15
deepest BTC drawdowns (peak, trough, recovery, durations).
**Why:** Drawdowns are the operational risk metric. Comparing BTC to SPY
shows why a breakout strategy that gives up return for a smaller drawdown
can still be attractive.
**Inputs:** `drawdowns.csv`, the BTC and SPY close series.

### 2.4 Equity curve and performance
**What:** Log-scale equity curves for the breakout strategy, BTC buy &
hold, and SPY buy & hold. A metrics table compares CAGR, Sharpe, Sortino,
max DD, win rate.
**Why:** The strategy is only useful if its risk-adjusted return is
competitive. The equity curve shows the journey; the metrics table shows
the summary.
**Inputs:** `performance.csv`, the equity series.

## 3. Filings page

### 3.1 Sector rotation
**What:** Stacked bar chart of sector weights over time, one chart per
selected fund. X-axis is quarter, Y-axis is % of reported portfolio.
**Why:** The 13F project's question is "how do superinvestors rotate
sectors over time?". This chart is the answer.
**Inputs:** `sector_weights.csv`.

### 3.2 Aggregate rotation
**What:** Line chart of average sector weights across the 8 funds over
time.
**Why:** Individual funds are noisy; the aggregate shows the consensus
rotation.
**Inputs:** `sector_weights.csv` averaged across funds.

### 3.3 Latest-quarter heatmap
**What:** Grid of fund (rows) × sector (cols) with the latest-quarter
weight in each cell, coloured by magnitude.
**Why:** A snapshot of "where is everyone right now?" — useful for
spotting crowded trades.
**Inputs:** `sector_weights.csv` filtered to the latest quarter.

## 4. Congress page

### 4.1 Trade feed
**What:** Paginated, filterable table of recent congress trades.
**Why:** The raw material for every other congress view. The operator
needs to be able to answer "what did Pelosi buy last week?" in two
clicks.
**Inputs:** `trades_with_sectors.csv`.

### 4.2 Consensus table
**What:** Per-ticker net signed USD with BUY/SELL/NEUTRAL flag.
**Why:** Aggregates the raw feed into an actionable signal — "is congress
net buying or selling this ticker?"
**Inputs:** `ticker_consensus.csv`.

### 4.3 Monthly consensus
**What:** Bar chart of net signed USD by month.
**Why:** Shows whether congress is net buying or selling over time — a
sentiment indicator.
**Inputs:** `monthly_consensus.csv`.

### 4.4 Committee alignment
**What:** Bar chart of committee-aligned vs non-aligned trades by
sector; table of committee × n_trades × buy/sell.
**Why:** The hypothesis is that politicians trade sectors their
committees oversee. The chart shows whether aligned trades are a
meaningful share of the total; the table shows which committees dominate.
**Inputs:** `committee_summary.csv`.

## 5. Database page

### 5.1 Tables
**What:** List of tables with row counts and last-modified time.
**Why:** Quick sanity check on what's loaded.

### 5.2 Query
**What:** Read-only SQL box for `SELECT` statements, results capped at
1000 rows.
**Why:** For ad-hoc checks that don't justify a notebook. The parser
rejects anything that isn't a `SELECT` so it can't damage the DB.

### 5.3 Export
**What:** Download the current query result as CSV.
**Why:** Lets the operator pull a slice into Excel without DB access.

## 6. Cross-cutting features

- **Dark mode default** with a light-mode toggle in the header.
- **Keyboard shortcuts** (see `PRODUCT_GUIDE.md` §3).
- **Stale banners** on any page whose underlying pipeline hasn't run in
  the last 24h.
- **Source CSV links** on every chart for full traceability.
- **Error toasts** for failed runs, with a link to the `pipeline_runs`
  row.
