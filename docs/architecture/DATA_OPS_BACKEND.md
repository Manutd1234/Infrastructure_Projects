# Data Ops Backend

The backend is the **operational spine** of the platform. It serves pipeline
outputs to the dashboard, ingests CSVs into the database, and records run
metadata. It deliberately contains no analytics — those live in the
pipelines.

## 1. Process model

```
                  ┌─────────────────────────────────────────────┐
                  │              FastAPI process (uvicorn)         │
                  │                                             │
   HTTP request ──►│  router ──► service ──► repository ──► SQLite │──► JSON response
                  │                                             │
                  │             └── /ops/run triggers ──┐        │
                  └────────────────────────────────────┼────────┘
                                                    ┌──▼──┐
                                                    │ sub │  (subprocess.run on the pipeline)
                                                    │ proc│
                                                    └──┬──┘
                                            pipeline writes ──► outputs/*.csv
                                                              │
                                              loader ingests ──► SQLite
```

- **Single process, multi-worker** behind uvicorn in production. SQLite
  handles concurrent reads; writes are serialised by SQLite's file lock.
- **Pipeline execution** is a `subprocess.run` of `python main.py` in the
  relevant pipeline folder. We do **not** import pipeline code into the
  backend process — that would couple release cycles and let a pipeline
  crash take down the API.

## 2. Layering

```
backend/app/
├── main.py              # FastAPI app, route registration, lifespan
├── core/
│   ├── config.py        # env-driven settings (pydantic-settings)
│   └── logging.py       # structured JSON logging
├── api/
│   ├── crypto.py        # /crypto/*
│   ├── filings.py       # /filings/*
│   ├── congress.py      # /congress/*
│   ├── ops.py           # /ops/* (run, status)
│   └── db.py            # /db/* (raw table browser)
├── services/
│   ├── crypto_service.py
│   ├── filings_service.py
│   ├── congress_service.py
│   └── ops_service.py   # subprocess runner + pipeline_runs writer
├── repositories/
│   └── db.py            # raw SQL via sqlite3 / SQLAlchemy
└── loaders/
    └── ingest.py        # CSV → SQLite
```

**Layer rule:** a router only calls its service; a service only calls its
repository or the loader; the repository only talks to SQLite. No layer
skips (router → repository is forbidden).

## 3. Endpoints

### Crypto (`/crypto`)
| Method | Path | Returns |
|---|---|---|
| GET | `/crypto/cycles` | bull/bear cycle history |
| GET | `/crypto/bear-markets` | bear market list |
| GET | `/crypto/breakouts` | +3σ breakout dates + forward returns |
| GET | `/crypto/drawdowns` | top drawdowns |
| GET | `/crypto/performance` | strategy vs buy & hold metrics |
| GET | `/crypto/equity-curve` | equity curve series |

### Filings (`/filings`)
| Method | Path | Returns |
|---|---|---|
| GET | `/filings/holdings` | holdings (filterable by fund, quarter) |
| GET | `/filings/sector-weights` | sector weights (filterable by fund) |
| GET | `/filings/funds` | list of tracked funds |

### Congress (`/congress`)
| Method | Path | Returns |
|---|---|---|
| GET | `/congress/trades` | trade feed (filterable by politician, ticker, party, date) |
| GET | `/congress/consensus` | per-ticker consensus |
| GET | `/congress/consensus/monthly` | monthly net signed USD |
| GET | `/congress/committees` | committee alignment summary |

### Ops (`/ops`)
| Method | Path | Returns |
|---|---|---|
| GET | `/ops/runs` | recent pipeline runs (freshness) |
| POST | `/ops/run/{pipeline}` | trigger a pipeline run (async) |
| GET | `/ops/run/{pipeline}/status` | poll run status |

### Database (`/db`)
| Method | Path | Returns |
|---|---|---|
| GET | `/db/tables` | list of tables + row counts |
| GET | `/db/query` | ad-hoc `SELECT` (read-only, restricted to safe statements) |

### Health
| Method | Path | Returns |
|---|---|---|
| GET | `/health` | liveness |
| GET | `/health/ready` | readiness (DB + latest pipeline run OK) |

## 4. Configuration

All config is environment-driven (see `.env.example`). The backend reads
via `pydantic-settings`:

```python
class Settings(BaseSettings):
    database_url: str = "sqlite:///database/nussif.db"
    pipelines_dir: Path = REPO_ROOT   # the three modules live at the repo root
    enable_run_endpoint: bool = False   # disabled by default; requires auth
    cors_origins: list[str] = ["http://localhost:5173"]
    log_level: str = "INFO"
```

`enable_run_endpoint` defaults to `False` so the `/ops/run/*` endpoints
return 403 unless explicitly enabled. Triggering pipelines from the API is
a privileged operation.

## 5. Error handling

- **4xx** for bad client input (validation, not found).
- **5xx** for backend / DB / pipeline failures. The error includes a
  correlation ID logged at request entry.
- **Pipeline run failures** do not 5xx the triggering request — the run
  is async; the failure is recorded in `pipeline_runs.status = 'FAILED'`
  and surfaced on the next `GET /ops/runs`.

## 6. Observability

- **Structured logs:** JSON to stdout, one line per request, with
  `request_id`, `method`, `path`, `status`, `duration_ms`.
- **Pipeline runs table:** the source of truth for "is the data fresh?".
- **Health endpoints:** `/health` for liveness (process alive),
  `/health/ready` for readiness (DB reachable and at least one pipeline
  has run in the last 24h).

## 7. Security

- **No auth by default.** The dashboard and API are intended for a single
  operator on a local machine. Before any network exposure, add OAuth
  (see `engineering/TLS_FLIP.md` for the cert rotation runbook and the
  `planning/PLAN.md` auth milestone).
- **Read-only DB access.** The `/db/query` endpoint parses the SQL, rejects
  anything that isn't a `SELECT`, and enforces a row limit.
- **No secrets in code.** All secrets via environment / `.env` (gitignored).
