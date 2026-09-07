# Data

Shared, cross-task data that doesn't belong to a single analysis module.

The three analysis **modules** live at the repo root as PascalCase
folders (`CryptoBullCycle/`, `ThirteenFFilings/`, `CongressTrading/`),
each with its own `outputs/` and `cache/`. This `data/` folder is for
data that is shared across modules or doesn't fit one module — for
example a shared market-data cache or a reference dataset.

```
data/
└── README.md          # this file
```

## Where things live

| Artifact | Location |
|---|---|
| Module source code | `CryptoBullCycle/`, `ThirteenFFilings/`, `CongressTrading/` (repo root) |
| Module raw cache (gitignored) | `<Module>/cache/` |
| Module outputs (committed) | `<Module>/outputs/*.csv` and `*.png` |
| SQLite database (gitignored) | `database/nussif.db` |
| Shared cross-task data | `data/` (this folder) |
| Run-all orchestrator | `run_all.py` (repo root) |

## Running everything

```bash
python run_all.py                              # runs all three modules
python -m backend.loaders.ingest               # loads their outputs/*.csv into SQLite
```
