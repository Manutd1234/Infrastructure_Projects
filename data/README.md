# Data

Raw and processed data for the platform.

```
data/
├── pipelines/              # three analysis packages (source of truth)
│   ├── crypto_bull_cycle/
│   ├── thirteen_f_filings/
│   └── congress_trading/
└── run_all.py              # run all three pipelines in sequence
```

See [`pipelines/README.md`](pipelines/README.md) for how to run the
pipelines and the conventions they follow.

## What lives where

- **Source code:** `data/pipelines/<name>/*.py`
- **Raw cache (gitignored):** `data/pipelines/<name>/cache/`
- **Outputs (committed):** `data/pipelines/<name>/outputs/*.csv` and `*.png`
- **Database (gitignored):** `database/nussif.db`

The database is not under `data/`; it lives in `database/` so the schema
and the file are co-located.
