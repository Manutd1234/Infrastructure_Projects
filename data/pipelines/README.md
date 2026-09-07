# Data pipelines

Three self-contained Python packages that fetch, parse, enrich, and
analyse data from external sources. Each writes structured CSVs and
PNG charts to its own `outputs/` folder. The backend ingests those
CSVs into SQLite.

```
data/pipelines/
├── crypto_bull_cycle/      # yfinance (BTC, SPY) → cycles, breakouts, drawdowns, backtest
├── thirteen_f_filings/     # Dataroma (8 funds) → holdings, sector weights, rotation
└── congress_trading/       # Capitol Trades → trades, consensus, committee signals
```

## Running

Each pipeline is run from its own folder so relative imports work:

```bash
cd data/pipelines/crypto_bull_cycle && python main.py
cd data/pipelines/thirteen_f_filings && python main.py
cd data/pipelines/congress_trading && python main.py
```

Or run all three:

```bash
python data/run_all.py
```

After running, ingest the CSV outputs into the database:

```bash
python -m backend.loaders.ingest
```

## Conventions

- **Idempotent:** re-running with the cache present only re-processes.
- **Cached:** raw fetches go to `cache/` (gitignored). Delete a
  pipeline's `cache/` to force a full re-pull.
- **Outputs committed:** `outputs/*.csv` and `outputs/*.png` are
  committed so the backend and dashboard have data without re-running.
- **No business logic in backend/frontend:** all analytics live here.
- **CSV contracts:** the schemas in `docs/architecture/DATA_PROCESSING_FLOW.md`
  and `database/schema.sql` are the contract with the backend.

## Per-pipeline docs

See each pipeline's own `README.md` for methodology and results:

- [`crypto_bull_cycle/README.md`](crypto_bull_cycle/README.md)
- [`thirteen_f_filings/README.md`](thirteen_f_filings/README.md)
- [`congress_trading/README.md`](congress_trading/README.md)
