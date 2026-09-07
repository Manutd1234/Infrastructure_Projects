# Data Processing Flow

## 1. End-to-end flow

```
   External source        Pipeline (Python)        Outputs (CSV/PNG)        Backend (FastAPI)        Dashboard / DB
   ───────────────        ─────────────────        ──────────────────        ────────────────        ────────────────
                                                                                                     
   yfinance ──────┐                                                                                  
   Dataroma ──────┼──► fetch ──► parse ──► enrich ──► analyse ──► write ──► load ──► serve ──► render    
   Capitol Trades┘     (cache)   (BS4)    (sectors)  (numpy)    (CSV/PNG)  (SQLite)  (JSON)   (React)   
                                                                                                     
                                                                                                     
                                            └────── pipeline_runs row written at start + end ──────┘
```

Each pipeline runs the same five-stage flow. The only things that change
between pipelines are the **source**, the **parse** step, and the
**analyse** step.

## 2. The five stages

### Stage 1 — Fetch

Pull raw data from the external source. Cache the raw response to
`cache/` so re-runs don't re-hit the network.

| Pipeline | Source | Cache artifact | Refresh policy |
|---|---|---|---|
| `crypto_bull_cycle` | yfinance `BTC-USD`, `SPY` | `cache/BTC-USD.csv`, `cache/SPY.csv` | Refresh if older than 1 day |
| `thirteen_f_filings` | Dataroma `/m/hist/p_hist.php?f=<code>` | `cache/<fund>.html` | Refresh if older than 12 hours |
| `congress_trading` | Capitol Trades `/trades?page=<N>` | `cache/trades.csv` | Refresh if older than 6 hours |

**Politeness:** every fetch sleeps between requests (0.2–1.0 s). The
scraper sends a desktop `User-Agent`. We never parallelise against a
single host.

### Stage 2 — Parse

Turn the raw response into a tidy DataFrame.

- **yfinance:** returns a DataFrame directly; we flatten the MultiIndex
  columns that newer yfinance versions return for single tickers.
- **Dataroma:** BeautifulSoup on the cached HTML; the portfolio-history
  page is a `<table>` with one `<tr>` per quarter and one `<td class="sym">`
  per holding. Each holding cell contains the ticker (in an `<a>` tag), the
  company name (in a `<b>` tag), and the weight (in trailing text).
- **Capitol Trades:** BeautifulSoup on the server-rendered `<table>`; one
  `<tr>` per trade with 10 cells (politician, issuer, published, traded,
  filed-after, owner, type, size, price, detail-link).

### Stage 3 — Enrich

Add derived columns that downstream stages need.

- **Sector classification:** every ticker is mapped to a GICS sector via a
  curated fallback dictionary (~250 tickers, including delisted names) and
  yfinance `Ticker.info['sector']` for the long tail. yfinance's slightly
  different labels (`Consumer Cyclical`, `Financial Services`, `Basic
  Materials`) are normalised to canonical GICS names. Results are cached to
  `cache/sectors.csv`.
- **Size parsing:** Capitol Trades discloses a range (`1K–15K`); we parse
  this into `size_low_usd` and `size_high_usd` and compute a midpoint.
- **Date normalisation:** all dates are parsed to `YYYY-MM-DD`.

### Stage 4 — Analyse

The pipeline-specific computation.

| Pipeline | Analysis | Key outputs |
|---|---|---|
| `crypto_bull_cycle` | Peak/trough cycle detection (≥20% decline = bear), 60-day realised vol scaled to weekly, +3σ breakout detection, forward-return study, drawdown extraction, backtest of "hold 30d after breakout" | `cycles.csv`, `bear_markets.csv`, `breakout_study.csv`, `drawdowns.csv`, `performance.csv` |
| `thirteen_f_filings` | Sector weights per fund per quarter, stacked-bar rotation, aggregate rotation, latest-quarter heatmap | `sector_weights.csv`, `holdings_with_sectors.csv` |
| `congress_trading` | Per-ticker and per-month consensus (signed USD), committee alignment (committee → sector → trade match) | `ticker_consensus.csv`, `monthly_consensus.csv`, `committee_summary.csv` |

### Stage 5 — Write

Serialise to `outputs/` as CSV (machine-readable, consumed by backend) and
PNG (human-readable, consumed by dashboard and whitepaper). Every run also
writes a row to `pipeline_runs` (via the backend loader, not directly) with
start time, end time, status, and row counts.

## 3. CSV schemas (contracts with the backend)

### `crypto_bull_cycle/outputs/cycles.csv`
```
type, start_date, end_date, start_price, end_price, return, duration_days
```

### `crypto_bull_cycle/outputs/breakout_study.csv`
```
horizon, n_breakouts, mean_breakout, median_breakout, pct_positive,
mean_all, t_stat, p_value, excess_vs_all
```

### `thirteen_f_filings/outputs/sector_weights.csv`
```
fund, quarter, sector, weight
```

### `congress_trading/outputs/trades_with_sectors.csv`
```
trade_id, politician_id, politician, party, chamber, state, issuer, ticker,
published, traded, filed_after_days, owner, trade_type, size_raw,
size_low_usd, size_high_usd, price, sector, committee_aligned,
matching_committees
```

### `congress_trading/outputs/ticker_consensus.csv`
```
ticker, issuer, sector, n_trades, n_buy, n_sell, net_signed_usd,
n_politicians, buy_pct, consensus
```

Full schemas for every output are in `database/schema.sql` (the loader
ingests each CSV into a matching table).

## 4. Failure modes and how they're handled

| Failure | Detection | Handling |
|---|---|---|
| External source down / rate-limited | `requests` raises or returns non-200 | Pipeline logs the error, writes a `FAILED` `pipeline_runs` row, exits non-zero. Cached outputs from the last successful run remain available. |
| Source schema changes (HTML drift) | Parser returns empty DataFrame | Pipeline raises `RuntimeError`; CI smoke test catches this before deploy. |
| yfinance sector lookup fails | `Ticker.info` returns None | Fallback to curated dictionary; if still unknown, sector = `Unknown`. |
| Partial page (Capitol Trades returns fewer rows) | Row count < expected | We take what's available and log a warning; do not fail the run. |
| Stale cache | Cache age check | If cache older than refresh policy, re-fetch; else use cache. |

## 5. Scheduling (current and target)

**Current:** manual. The operator runs `python main.py` in each pipeline, or
`python data/run_all.py` to run all three.

**Target:** a single scheduler (cron for now, Prefect later) runs each
pipeline on its refresh policy:

```
0 6 * * *   cd data/pipelines/crypto_bull_cycle && python main.py     # daily 06:00
0 8 * * 1   cd data/pipelines/thirteen_f_filings && python main.py  # weekly Mon 08:00
0 9 * * *   cd data/pipelines/congress_trading && python main.py     # daily 09:00
```

The scheduler writes `pipeline_runs` rows so the dashboard's Overview page
can show freshness at a glance.
