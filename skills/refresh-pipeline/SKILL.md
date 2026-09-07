---
name: refresh-pipeline
description: Refresh a single data pipeline by name (crypto_bull_cycle, thirteen_f_filings, or congress_trading). Use when the user asks to refresh, re-run, or update one specific dataset.
---

# Refresh a single pipeline

Run one pipeline by name and report the result.

## Steps

1. Confirm the pipeline name is one of:
   - `CryptoBullCycle`
   - `ThirteenFFilings`
   - `CongressTrading`
   If the user gave a fuzzy name (e.g. "crypto", "13f", "congress", "task 1",
   "task 3", "task 4"), map it to the canonical name and confirm with the
   user before running.
2. Run the module:
   ```bash
   cd <pipeline> && python main.py
   ```
3. Ingest its CSV outputs into the database:
   ```bash
   python -m backend.loaders.ingest --pipeline <pipeline>
   ```
4. Report: pipeline name, exit status, row count produced, and the
   timestamp of the most recent output CSV in `outputs/`.

## When to force a cache invalidation

Only if the user explicitly says "fresh pull", "ignore cache", or
"re-download". In that case, delete `<pipeline>/cache/` (e.g.
`CryptoBullCycle/cache/`) before running, and warn the user that this is
impolite to the upstream source.
