---
name: run-all-pipelines
description: Run all three data pipelines (crypto cycle, 13F filings, congress trading) and report freshness. Use when the user asks to refresh all data, run all pipelines, or check data freshness.
---

# Run all pipelines

Run the three data pipelines in sequence and report their status. Each
pipeline is self-contained and idempotent — re-running is safe.

## Steps

1. Run each module from its folder:
   ```bash
   cd CryptoBullCycle && python main.py
   cd ThirteenFFilings && python main.py
   cd CongressTrading && python main.py
   ```
2. After all three finish, ingest their CSV outputs into the database:
   ```bash
   python -m backend.loaders.ingest
   ```
3. Report a one-line summary per pipeline: name, last-run status, row
   count, and the timestamp of the most recent output CSV.

## Notes

- If a pipeline fails, do not abort the others — run all three and report
  which failed.
- Pipelines cache to `cache/`; deleting a pipeline's `cache/` folder
  forces a full re-pull. Only do this if the user explicitly asks.
- Do not run pipelines in parallel — they share a venv and the upstream
  sources are rate-limited.
