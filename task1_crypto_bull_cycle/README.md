# Task 1 — Crypto Bull Cycle (BTC)

**Owner:** Ting Xuan
**Question:** Does Bitcoin exhibit positive post-breakout drift after a >+3σ weekly return, where σ is the preceding 60-day realised volatility scaled to a weekly horizon? Also: how long do bull and bear cycles last, and what are the drawdowns?

## What this folder does

| File | Purpose |
|---|---|
| `data_loader.py` | Pulls BTC-USD and SPY daily OHLCV from yfinance; caches to `cache/` so re-runs are instant. |
| `cycle_analysis.py` | Identifies bull/bear cycles via local peak/trough detection. A bear market = peak-to-trough decline ≥ 20%. Reports average durations and returns. |
| `drawdowns.py` | Drawdown series, top-N deepest drawdowns with peak/trough/recovery dates and durations. |
| `breakout_backtest.py` | The core study: computes 60-day realised vol scaled to a weekly horizon, finds >+3σ weekly breakouts, measures forward 30/60/120/365-day returns, runs a t-test vs. the unconditional baseline, and backtests a "hold 30 days after breakout" strategy. |
| `spy_benchmark.py` | SPY comparison: correlation, rolling 90-day correlation, CAGR, max drawdown. |
| `backtest_engine.py` | Generic long-only backtester (CAGR, Sharpe, Sortino, Calmar, max DD, win rate). Reused across tasks. |
| `main.py` | Runs everything and writes CSVs + charts to `outputs/`. |

## How to run

```bash
pip install -r requirements.txt
python main.py
```

## Method details

### Cycle identification
Local extrema are detected with a window of ±45 days (the `order` parameter). A bear market is any peak-to-trough decline ≥ 20% (the conventional equity threshold, applied to BTC). Bull markets are the trough-to-peak advances between bear markets.

### Breakout drift test
1. Daily log returns `r_t = ln(P_t / P_{t-1})`.
2. 60-day realised vol: `σ_daily = std(r_t over last 60 days)`, scaled to weekly: `σ_weekly = σ_daily · √7`.
3. Trailing weekly return: `R_week_t = P_t / P_{t-7} − 1`.
4. Breakout signal at `t` when `R_week_t > +3 · σ_weekly_t`. `σ_weekly_t` uses only returns strictly before `t`, so there is no look-ahead.
5. Forward returns: `P_{t+h} / P_t − 1` for `h ∈ {30, 60, 120, 365}`.
6. Statistical test: one-sample t-test of breakout forward returns against the unconditional mean of all forward returns at the same horizon. Also report the share of breakouts that were positive.

### Backtest
A simple, fully-collateralised long-only strategy: go long BTC for 30 calendar days after each breakout signal, flat otherwise. 10 bps per unit turnover cost. Compared to BTC buy-and-hold and SPY buy-and-hold.

## Key results (run on 2014-09-17 → 2026-09-07)

- **Cycles:** 23 bear markets, 25 bull markets. Average bear duration ≈ 61 days, average bull duration ≈ 109 days. Deepest drawdowns: −83.4% (2017-12 → 2018-12), −76.6% (2021-11 → 2022-11), −61.1% (2014-09 → 2015-01), −53.1% (2025-10 → 2026-06, ongoing).
- **Breakout drift:** 79 breakouts found. Forward returns after breakouts are positive at 30/60/365 days (e.g. +9.5% at 30d, +202% at 365d) and 71–88% of breakouts were followed by positive forward returns. The excess vs. baseline is positive at 30/60/365d but the t-tests are not significant at 5% (p ≈ 0.12, 0.65, 0.14) — directionally supportive of positive drift but the sample is small and crypto forward returns are extremely disperse.
- **Strategy vs. buy & hold:** Breakout strategy CAGR ≈ 30% with max DD −34% vs. BTC buy & hold CAGR ≈ 54% with max DD −83%. Same Sharpe (~0.99) but roughly half the drawdown — the strategy gives up return for a much smoother equity curve.
- **BTC vs. SPY:** Correlation ≈ 0.24 (low). BTC CAGR 53.9% / max DD −83%; SPY CAGR 13.8% / max DD −34%.

See `outputs/` for the full CSV tables and charts (`cycles.png`, `breakout_forward.png`, `drawdown.png`, `equity_curve.png`, `correlation.png`).
