# Feature Tour

A walkthrough of the dashboard, one feature at a time. Read alongside
`PRODUCT_GUIDE.md` (the how-to) — this document is the *what* and *why*.

## 1. Overview Page

**What:** A single screen showing the health of all three quantitative pipelines and cross-asset market conditions.
**Why:** The operator's first question is always "is the data fresh?". This
page answers it in under 10 seconds without scrolling.
**Components:**
- Pipeline status cards (3) with traffic-light freshness chips.
- Live Cross-Asset Market Marquee: L1 quotes for `X:BTCUSD`, `SPY`, `QQQ`, `IWM` streamed via WebSocket `/ws/telemetry`.
- Recent-runs audit table (last 20) with execution status, row production count, duration, and error traces.
- "Run" trigger button per pipeline (asynchronous subprocess execution).

## 2. Crypto Page

### 2.1 Cycle Chart
**What:** BTC price on a log scale, with bull (green) and bear (red)
shaded bands marking each cycle episode.
**Why:** Cycle identification is the foundation of the crypto study;
showing it on the price chart lets the operator eyeball whether the
algorithm's peaks and troughs match historical reality.
**Inputs:** `cycles.csv` from `CryptoCycle`.

### 2.2 Breakout Study
**What:** Grouped bars of mean forward return after +3σ weekly breakouts vs. the
unconditional baseline, for 30/60/120/365-day horizons. A table below shows
n_breakouts, t-stat, p-value, and excess return.
**Why:** The core hypothesis of the crypto project is that BTC drifts up
after +3σ weekly breakouts. The chart makes the directional signal
visible; the table makes the statistical strength honest.
**Inputs:** `breakout_study.csv`, `breakout_dates.csv`.

### 2.3 Drawdowns
**What:** BTC and SPY drawdown series overlaid, with a table of the top-15
deepest BTC drawdowns (peak, trough, recovery, durations).
**Why:** Drawdowns are the operational risk metric. Comparing BTC to SPY
shows why a breakout strategy that gives up return for a smaller drawdown
can still be attractive.
**Inputs:** `drawdowns.csv`, the BTC and SPY close series.

### 2.4 Equity Curve and Performance
**What:** Log-scale equity curves for the breakout strategy, BTC buy &
hold, and SPY buy & hold. A metrics table compares CAGR, Sharpe, Sortino,
max DD, and win rate.
**Why:** The strategy is only useful if its risk-adjusted return is
competitive. The equity curve shows the journey; the metrics table shows
the summary.
**Inputs:** `performance.csv`, `CryptoCycle/cache/BTC-USD.csv`.

## 3. Filings Page

### 3.1 Sector Rotation
**What:** Stacked bar chart of sector weights over time, one chart per
selected fund. X-axis is quarter, Y-axis is % of reported portfolio.
**Why:** The 13F project's question is "how do superinvestors rotate
sectors over time?". This chart is the empirical answer.
**Inputs:** `sector_weights.csv` from `HedgeFund13F`.

### 3.2 Aggregate Rotation & Active Share
**What:** Average sector weights and factor replication across the 8 funds over time.
**Why:** Individual funds are noisy; the aggregate shows consensus
institutional rotation.
**Inputs:** `sector_weights.csv` averaged across funds.

### 3.3 Latest-Quarter Heatmap
**What:** Grid of fund (rows) × sector (cols) with latest-quarter
weights in each cell, coloured by magnitude.
**Why:** A snapshot of "where is everyone right now?" — useful for
spotting crowded trades.
**Inputs:** `sector_weights.csv` filtered to the latest quarter.

## 4. Congress Page

### 4.1 Trade Feed
**What:** Paginated, filterable table of recent congress trades.
**Why:** The raw material for every other congress view. The operator
needs to be able to answer "what did Pelosi buy last week?" in two
clicks.
**Inputs:** `trades_with_sectors.csv` from `CongressTrades`.

### 4.2 Consensus Table
**What:** Per-ticker net signed USD with BUY/SELL/NEUTRAL flag.
**Why:** Aggregates the raw feed into an actionable signal — "is congress
net buying or selling this ticker?"
**Inputs:** `ticker_consensus.csv`.

### 4.3 Monthly Consensus
**What:** Bar chart of net signed USD by month.
**Why:** Shows whether congress is net buying or selling over time — a
macro sentiment indicator.
**Inputs:** `monthly_consensus.csv`.

### 4.4 Committee Alignment
**What:** Bar chart of committee-aligned vs non-aligned trades by
sector; table of committee × n_trades × buy/sell.
**Why:** The hypothesis is that politicians trade sectors their
committees oversee. The chart shows whether aligned trades are a
meaningful share of the total; the table shows which committees dominate.
**Inputs:** `committee_summary.csv`.

## 5. Database Page

### 5.1 Tables & Schema Explorer
**What:** List of tables with row counts and column structure.
**Why:** Quick sanity check on loaded warehouse state.

### 5.2 AST Sandboxed Query Console
**What:** Read-only SQL console for `SELECT` statements, results capped at
1000 rows.
**Why:** For ad-hoc checks that don't justify a notebook. An AST syntax
parser rejects mutations or injection attempts so it can never damage the DB.

### 5.3 Storage Engine Telemetry
**What:** Real-time metrics on SQLite WAL mode, memory cache hit rates, and query latency benchmarks.
**Why:** Confirms that warehouse read queries operate below latency budget thresholds (<2ms).
