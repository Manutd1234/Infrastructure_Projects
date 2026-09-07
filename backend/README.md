# Backend (FastAPI)

The backend is the **transport layer** for the platform. It serves
pipeline outputs (loaded into SQLite) as typed JSON to the dashboard. It
contains **no analytics** — all computation lives in the three root modules.

See `docs/architecture/DATA_OPS_BACKEND.md` for the full design.

## Layout

```
backend/
├── app/
│   ├── main.py              # FastAPI app, route registration, middleware
│   ├── core/
│   │   ├── config.py        # env-driven settings (pydantic-settings)
│   │   └── logging.py       # structured JSON logging
│   ├── api/                # routers (one file per surface)
│   │   ├── crypto.py        # /crypto/*
│   │   ├── filings.py       # /filings/*
│   │   ├── congress.py      # /congress/*
│   │   ├── ops.py           # /ops/* (run pipelines, status)
│   │   └── db.py            # /db/* (read-only SQL browser)
│   ├── services/           # business logic (calls repositories)
│   └── repositories/       # SQL (sqlite3)
├── loaders/
│   └── ingest.py           # CSV → SQLite
├── requirements.txt
└── README.md
```

## Layering rule

A router only calls its service; a service only calls its repository or
the loader; the repository only talks to SQLite. No layer skips.

## Quickstart

```bash
pip install -r backend/requirements.txt
python database/init_db.py                       # create the DB
python -m backend.loaders.ingest                # load pipeline CSVs into DB
uvicorn backend.app.main:app --reload          # http://localhost:8000
```

OpenAPI docs at `http://localhost:8000/docs`.

## Endpoints

| Surface | Prefix | Purpose |
|---|---|---|
| Crypto | `/crypto/*` | cycles, breakouts, drawdowns, performance |
| Filings | `/filings/*` | holdings, sector weights, funds |
| Congress | `/congress/*` | trades, consensus, committee signals |
| Ops | `/ops/*` | run pipelines, list runs, poll status |
| Database | `/db/*` | read-only SQL browser |
| Health | `/health`, `/health/ready` | liveness, readiness |

## Triggering a pipeline run

`POST /ops/run/{pipeline}` is **disabled by default**. Set
`NUSSIF_ENABLE_RUN_ENDPOINT=true` in `.env` to enable. The endpoint
spawns the pipeline as a subprocess and records a `pipeline_runs` row;
it returns immediately with a `run_id` for status polling.

## Configuration

All settings are environment-driven (see `.env.example`), read via
`pydantic-settings` with the `NUSSIF_` prefix:

| Env var | Default | Purpose |
|---|---|---|
| `NUSSIF_DATABASE_URL` | `sqlite:///database/nussif.db` | DB connection |
| `NUSSIF_PIPELINES_DIR` | repo root | where the three modules live |
| `NUSSIF_ENABLE_RUN_ENDPOINT` | `false` | gate the `/ops/run/*` endpoints |
| `NUSSIF_RUN_TIMEOUT_SECONDS` | `600` | subprocess timeout |
| `NUSSIF_CORS_ORIGINS` | `http://localhost:5173` | allowed origins |
| `NUSSIF_LOG_LEVEL` | `INFO` | logging level |
