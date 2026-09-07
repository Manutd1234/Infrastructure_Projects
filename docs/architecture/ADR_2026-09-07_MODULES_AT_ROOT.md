# ADR 2026-09-07: One folder per analysis module at the repo root

- **Status:** Accepted
- **Date:** 2026-09-07
- **Supersedes:** `ADR_2026-09-07_PROJECT_RESTRUCTURE.md` (in part — the
  "move into `data/pipelines/`" decision is reversed; the layered
  platform decision stands)

## Context

The previous ADR moved the three analysis projects into `data/pipelines/`
to keep the repo root tidy. In practice this made the modules harder to
find and obscured that they are first-class, independently-runnable
products — not just "data". Each module is a self-contained research
project with its own README, requirements, and outputs, and deserves to
be a top-level folder.

## Decision

Move the three analysis modules back to the repo root as PascalCase
folders:

```
Infrastructure_Projects/
├── CryptoBullCycle/        # task 1 — BTC cycle + breakout study
├── ThirteenFFilings/      # task 3 — 13F sector rotation
├── CongressTrading/        # task 4 — congress trading + committees
├── backend/                # shared FastAPI transport
├── frontend/               # shared React dashboard
├── database/               # shared SQLite schema
├── data/                   # shared cross-task data (not module-specific)
├── docs/                   # institutional documentation
├── notebooks/              # exploratory analysis
├── skills/                 # Cursor agent skills
├── run_all.py              # run all three modules
├── .env.example
├── README.md
├── LICENSE
└── .gitignore
```

The shared infrastructure (`backend/`, `frontend/`, `database/`,
`data/`, `docs/`, `notebooks/`, `skills/`) stays at the root. The three
modules are peers of the shared infrastructure, not nested under `data/`.

## Consequences

- **Positive:** each module is discoverable at the root and clearly a
  first-class product. `git mv` preserves history.
- **Positive:** `data/` is now unambiguously for shared cross-task data,
  not a dumping ground for the modules.
- **Negative:** the repo root has more top-level folders. Acceptable —
  the modules are the point of the repo.
- **Negative:** the backend's `pipelines_dir` is now the repo root, and
  the ops runner joins it with the PascalCase module name. The
  `ALLOWED_PIPELINES` set and the loader's `CSV_TO_TABLE` keys use the
  PascalCase names.

## Compliance

- Module folders use PascalCase: `CryptoBullCycle`, `ThirteenFFilings`,
  `CongressTrading`.
- `backend/app/api/ops.py` `ALLOWED_PIPELINES` and
  `backend/loaders/ingest.py` `PIPELINES` use the same PascalCase names.
- `run_all.py` iterates the PascalCase names and runs `python main.py`
  in each.
