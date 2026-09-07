# Crypto bull cycle

## Question

Does Bitcoin exhibit positive post-breakout drift after a weekly return
exceeding +3 standard deviations, where sigma is estimated from the
preceding 60-day realised volatility and scaled to a weekly horizon?
How long do bull and bear cycles last, and what are the drawdowns?

## Method

1. Daily log returns `r_t = ln(P_t / P_{t-1})`.
2. 60-day realised volatility `sigma_daily = std(r_t over last 60 days)`,
   scaled to weekly: `sigma_weekly = sigma_daily * sqrt(7)`.
3. Trailing weekly return `R_week_t = P_t / P_{t-7} - 1`.
4. Breakout signal at `t` when `R_week_t > +3 * sigma_weekly_t`, with
   `sigma_weekly_t` computed from returns strictly before `t` (no
   look-ahead).
5. Forward returns `P_{t+h} / P_t - 1` for `h in {30, 60, 120, 365}`.
6. One-sample t-test of breakout forward returns against the
   unconditional mean of all forward returns at the same horizon.
7. Backtest: hold BTC for 30 days after each breakout, flat otherwise;
   10 bps per unit turnover. Compared to BTC buy & hold and SPY buy &
   hold.

Cycles are identified by local peak/trough detection (window ±45 days);
a bear market is a peak-to-trough decline of at least 20%.

## Headline results (2014-09-17 → 2026-09-07)

- 23 bear markets, 25 bull markets. Average bear duration ≈ 61 days;
  average bull duration ≈ 109 days.
- Deepest drawdowns: −83.4% (2017-12 → 2018-12), −76.6% (2021-11 →
  2022-11), −61.1% (2014-09 → 2015-01), −53.1% (2025-10 → 2026-06,
  ongoing).
- 79 +3σ breakouts. Forward returns after breakouts are positive at
  30/60/365 days (+9.5%, +14.4%, +202%) and 71–88% of breakouts were
  followed by positive forward returns. The excess vs. baseline is
  positive at 30/60/365 days but the t-tests are not significant at 5%
  (p ≈ 0.12, 0.65, 0.14) — directionally supportive of positive drift
  but the sample is small and crypto forward returns are extremely
  disperse.
- Breakout strategy: CAGR ≈ 30%, max DD −34%, Sharpe ≈ 0.99. BTC buy &
  hold: CAGR ≈ 54%, max DD −83%, Sharpe ≈ 0.99. Same Sharpe, roughly half
  the drawdown — the strategy trades return for a much smoother equity
  curve.
- BTC vs. SPY: correlation ≈ 0.24. BTC CAGR 53.9% / max DD −83%; SPY
  CAGR 13.8% / max DD −34%.
