# Backend (FastAPI Transport Microservices)

The backend is the **transport layer** for the NUSSIF platform. It serves
pipeline outputs (loaded into SQLite WAL storage) as strongly typed JSON to the dashboard. It
contains **no analytics** — all quantitative computation lives in the three root modules
(`CryptoCycle/`, `HedgeFund13F/`, and `CongressTrades/`).

See `docs/architecture/DATA_OPS_BACKEND.md` for the full design.

## Layout

```
backend/
├── app/
│   ├── main.py              # FastAPI app, route registration, middleware, metrics
│   ├── core/
│   │   ├── config.py        # env-driven settings (pydantic-settings)
│   │   └── logging.py       # structured JSON logging
│   ├── schemas/             # Pydantic models for request validation and OpenAPI docs
│   │   ├── __init__.py
│   │   └── models.py        # typed response/request models for all endpoints
│   ├── api/                 # routers (modular microservices)
│   │   ├── crypto.py        # /crypto/* (cycles, breakouts, drawdowns, equity curve)
│   │   ├── filings.py       # /filings/* (funds, holdings, sector weights)
│   │   ├── congress.py      # /congress/* (trades, consensus, committees)
│   │   ├── ops.py           # /ops/* (run pipelines, status)
│   │   ├── db.py            # /db/* & /api/database/* (AST sandboxed query browser)
│   │   ├── market.py        # /market/* (L1 quotes, Massive status)
│   │   └── telemetry.py     # /ws/telemetry (WebSocket streaming tape)
│   ├── services/            # business logic with explicit column projections
│   │   ├── crypto_service.py
│   │   ├── filings_service.py
│   │   ├── congress_service.py
│   │   └── ops_service.py
│   └── repositories/        # SQLite WAL connection with memory cache tuning
│       └── db.py
├── loaders/
│   └── ingest.py            # CSV → SQLite loader
├── tests/                   # automated unit & integration test suite
│   ├── test_health.py
│   ├── test_crypto.py
│   ├── test_filings.py
│   ├── test_congress.py
│   ├── test_ops.py
│   ├── test_db.py
│   ├── test_market.py
│   └── test_telemetry.py
├── bench.py                 # latency benchmarking runner (p50/p95/p99)
├── requirements.txt
└── README.md
```

## Layering Rule

A router only calls its service; a service only calls its repository or
the loader; the repository only talks to SQLite. No layer skips (e.g. router → repository is forbidden).
Read queries use explicit column lists (`SELECT col1, col2`) rather than `SELECT *`.

## Quickstart

```bash
# Install backend requirements
pip install -r backend/requirements.txt

# Create the SQLite WAL database and ingest pipeline CSVs
python database/init_db.py
python -m backend.loaders.ingest

# Run automated tests
pytest backend/tests/

# Run latency benchmarks
python backend/bench.py

# Start dev server
uvicorn backend.app.main:app --reload  # http://localhost:8000
```

Interactive OpenAPI documentation is available at `http://localhost:8000/docs` and `http://localhost:8000/redoc`.

## Endpoints

| Surface | Prefix / Path | Purpose |
|---|---|---|
| Crypto | `/crypto/*` | cycles, bear-markets, breakouts, breakout-dates, drawdowns, performance, equity-curve |
| Filings | `/filings/*` | holdings, sector weights, tracked funds |
| Congress | `/congress/*` | trade feed (filtered), ticker consensus, monthly consensus, committee signals |
| Ops | `/ops/*` | trigger pipeline runs, list execution history, poll status |
| Database | `/db/*` & `/api/database/*` | AST sandboxed read-only SQL warehouse browser |
| Market | `/market/*` | L1 previous-close quotes, Massive provider connectivity |
| Telemetry | `/ws/telemetry` | WebSocket real-time cross-asset tape and pipeline state |
| Health & Ops | `/health`, `/health/ready`, `/metrics` | liveness, readiness, latency percentiles |

*Note: For maximum client compatibility, all REST endpoints are accessible both directly (e.g. `/crypto/cycles`) and via `/api` prefixes (e.g. `/api/crypto/cycles`).*

## Security & AST Query Sandbox

The `/db/query` endpoint enforces an AST security guardrail:
- Only single `SELECT` or `EXPLAIN` statements are permitted.
- Multi-statement execution (semicolon chaining) is strictly rejected (HTTP 403).
- Mutation keywords (`DROP`, `INSERT`, `UPDATE`, `DELETE`, `ALTER`, `CREATE`, `ATTACH`, `DETACH`, `PRAGMA`, `REPLACE`, `VACUUM`) are prohibited anywhere in the query string.
- Database connections use SQLite `PRAGMA query_only = ON` in read mode.

## Triggering a Pipeline Run

`POST /ops/run/{pipeline}` is **disabled by default**. Set
`NUSSIF_ENABLE_RUN_ENDPOINT=true` in `.env` to enable. The endpoint
spawns the target pipeline as an isolated background subprocess and records a `pipeline_runs` row;
it returns immediately (HTTP 202) with a `run_id` for asynchronous status polling.

## Configuration

All settings are environment-driven, read via `pydantic-settings` with the `NUSSIF_` prefix:

| Env var | Default | Purpose |
|---|---|---|
| `NUSSIF_DATABASE_URL` | `sqlite:///database/nussif.db` | DB connection path |
| `NUSSIF_PIPELINES_DIR` | repo root | location of the analysis modules |
| `NUSSIF_ENABLE_RUN_ENDPOINT` | `false` | gate the `/ops/run/*` endpoints |
| `NUSSIF_RUN_TIMEOUT_SECONDS` | `600` | pipeline subprocess timeout |
| `NUSSIF_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | allowed CORS origins |
| `NUSSIF_LOG_LEVEL` | `INFO` | logging severity |
