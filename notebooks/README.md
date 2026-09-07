# Notebooks

Jupyter notebooks for exploratory analysis that doesn't belong in a
production pipeline. Notebooks are version-controlled but **not** loaded
by the backend.

## Conventions

- Run `nbstripout --install` once so outputs are stripped on commit.
- Name notebooks `NN_topic.ipynb` (zero-padded) so they sort in reading order.
- Notebooks are exploratory. Production logic belongs in a pipeline.
- Notebooks **may** import from the three root modules (they share the venv).

## Notebooks

| Notebook | Purpose |
|---|---|
| `01_crypto_cycle_exploration.ipynb` | BTC cycle durations, breakout drift significance, strategy vs buy & hold |
| `02_filings_sector_exploration.ipynb` | Latest-quarter crowded sectors, per-fund concentration (Herfindahl) |
| `03_congress_consensus.ipynb` | Committee-aligned share, top buys/sells by net signed USD, committee signals |

## Running

```bash
pip install jupyter pandas matplotlib
jupyter notebook
```

The notebooks use relative paths (`../CryptoCycle/outputs`, etc.) so they
must be run from this folder.
