# Risk

## Data risk

- **Upstream changes:** Dataroma and Capitol Trades can change their HTML
  at any time. Smoke tests in CI catch this; the cache means the last
  good data stays available while a fix is written.
- **yfinance rate limits:** mitigated by caching and a daily schedule.
  A fallback to CoinGecko is the contingency.
- **Stale data:** the dashboard surfaces staleness explicitly via the
  Overview chips and per-page banners. The operator never silently
  reads stale data as if it were fresh.

## Methodology risk

- The +3σ breakout study has a small sample (79 breakouts) and crypto
  forward returns are extremely disperse. The t-tests are not significant
  at 5%; the directional signal is interesting but not conclusive.
- The 13F sector weights are computed from the **top-20** holdings per
  quarter (Dataroma's free tier). They capture ~80–95% of these
  concentrated funds' book value but not the full portfolio.
- The congress committee mapping is curated for 39 politicians; the
  alignment rate would change if the universe were expanded. The
  committee → sector mapping is a judgement call and is documented in
  `CongressTrading/committee_signals.py`.

## Operational risk

- The dashboard has **no auth** by default. It is intended for a single
  operator on a local machine. Before any network exposure, add OAuth
  (see `planning/PLAN.md` Phase 6).
- The `/ops/run/*` endpoints are disabled by default
  (`enable_run_endpoint=false`). Enabling them lets the dashboard
  trigger pipeline runs; rate-limit before exposing.
- The DB browser is read-only and rejects non-`SELECT` statements, but
  it is still a power tool. Restrict to the operator.

## Not financial advice

This platform is a research and monitoring tool. It does not place
orders, manage positions, or connect to a broker. Nothing in this
whitepaper or in the dashboard is investment advice.
