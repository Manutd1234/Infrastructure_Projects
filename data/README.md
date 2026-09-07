# Data

Shared, cross-module data only. The three analysis modules live at the
repo root (`CryptoCycle/`, `HedgeFund13F/`, `CongressTrades/`), each
with its own `outputs/` and `cache/`.

```bash
python run_all.py
python -m backend.loaders.ingest
```
