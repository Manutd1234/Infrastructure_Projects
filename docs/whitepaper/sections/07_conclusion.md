# Conclusion

NUSSIF Infrastructure Projects delivers three reproducible research
pipelines behind a single operational dashboard. The layering keeps
analytics in the pipelines and presentation in the frontend, with a
thin FastAPI backend and a SQLite store in between. The dashboard lets
a Trading Desk Operations Engineer monitor freshness, inspect
signals, and replay analyses without writing code.

Headline findings from the most recent run:

- BTC exhibits directionally positive post-breakout drift after +3σ
  weekly returns, but the sample is too small and disperse for
  statistical significance. A "hold 30 days after breakout" strategy
  matches BTC buy & hold on Sharpe with roughly half the drawdown.
- Superinvestor sector rotation shows a recent Technology and
  Communication Services build funded partly by Financials de-risking.
  Concentration varies widely: Himalaya is ~75% in two sectors
  (China-focused), Valley Forge is ~100% Financials + Technology.
- 35.7% of congress trades are committee-aligned — meaningfully above
  the random baseline. Armed Services and HELP are the strongest
  committee signals.

Next milestones (see `planning/PLAN.md`): wire the backend to the
database loader, complete the dashboard's chart components, add a
scheduler, and compile the whitepaper PDF in CI.
