---
name: generate-ops-report
description: Generate a one-page operations report (pipeline freshness, latest signals, anomalies). Use when the user asks for a status report, ops summary, or "what's the state of the desk".
---

# Generate an operations report

Produce a concise operations report for the Trading Desk Operations
Engineer.

## Steps

1. Query the database for the latest pipeline run per pipeline:
   ```sql
   SELECT pipeline, status, started_at, ended_at, rows_produced, error
   FROM pipeline_runs
   ORDER BY started_at DESC;
   ```
   Summarise: which pipelines are fresh (last run < 24h and SUCCEEDED),
   which are stale, which failed.

2. Pull the latest crypto breakout study:
   ```sql
   SELECT horizon, n_breakouts, mean_breakout, excess_vs_all, p_value
   FROM crypto_breakout ORDER BY horizon;
   ```

3. Pull the latest congress consensus top buys and sells:
   ```sql
   SELECT ticker, issuer, net_signed_usd, consensus
   FROM ticker_consensus
   ORDER BY net_signed_usd DESC LIMIT 5;
   SELECT ticker, issuer, net_signed_usd, consensus
   FROM ticker_consensus
   ORDER BY net_signed_usd ASC LIMIT 5;
   ```

4. Pull the latest-quarter 13F aggregate sector weights:
   ```sql
   SELECT sector, AVG(weight) AS avg_weight
   FROM sector_weights
   WHERE quarter = (SELECT MAX(quarter) FROM sector_weights)
   GROUP BY sector ORDER BY avg_weight DESC;
   ```

5. Write the report as a short markdown summary with three sections:
   **Freshness**, **Signals**, **Anomalies** (anything failed, stale, or
   unusually large). Keep it under one screen.

## Notes

- Use `sqlite3 database/nussif.db` or the `/db/query` endpoint — either
  is fine.
- If the database is empty, say so and suggest running the
  `run-all-pipelines` skill.
