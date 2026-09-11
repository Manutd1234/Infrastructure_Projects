# Data Ops Backend

The backend is the **operational spine** of the platform. It serves pipeline
outputs to the dashboard, ingests CSVs into the database, streams market telemetry,
and records run metadata. It deliberately contains no analytics — those live in the
root quantitative modules (`CryptoCycle`, `HedgeFund13F`, `CongressTrades`).

## 1. Process Model

```
                  ┌────────────────────────────────────────────────────────┐
                  │              FastAPI process (uvicorn)                 │
                  │                                                        │
   HTTP request ──►│  router ──► service ──► repository ──► SQLite (WAL)   │──► JSON response
                  │                                                        │
                  │  /ws/telemetry ◄── L1 Quotes & Pipeline State Broadcast│──► WS Frames
                  │                                                        │
                  │             └── /ops/run triggers ──┐                  │
                  └─────────────────────────────────────┼──────────────────┘
                                                     ┌──▼──┐
                                                     │ sub │  (subprocess.run on the pipeline)
                                                     │ proc│
                                                     └──┬──┘
                                             pipeline writes ──► outputs/*.csv
                                                               │
                                               loader ingests ──► SQLite
```

- **Single process, multi-worker** behind uvicorn in production. SQLite
  operates in `WAL` mode with snapshot isolation so concurrent reads never block writes.
- **Pipeline execution** is a `subprocess.run` of `python main.py` in the
  relevant pipeline folder. We do **not** import pipeline code into the
  backend process — that would couple release cycles and let a pipeline
  crash take down the API.

## 2. Layering

```
backend/app/
├── main.py              # FastAPI app, route registration, metrics middleware
├── core/
│   ├── config.py        # env-driven settings (pydantic-settings)
│   └── logging.py       # structured JSON logging
├── schemas/             # Pydantic models for request/response serialization
│   └── models.py
├── api/
│   ├── crypto.py        # /crypto/*
│   ├── filings.py       # /filings/*
│   ├── congress.py      # /congress/*
│   ├── ops.py           # /ops/* (run, status)
│   ├── db.py            # /db/* & /api/database/* (AST sandboxed SQL console)
│   ├── market.py        # /market/* (L1 quotes, Massive status)
│   └── telemetry.py     # /ws/telemetry (WebSocket streaming tape)
├── services/
│   ├── crypto_service.py
│   ├── filings_service.py
│   ├── congress_service.py
│   └── ops_service.py   # subprocess runner + pipeline_runs writer
├── repositories/
│   └── db.py            # SQLite WAL connection with memory cache tuning
└── loaders/
    └── ingest.py        # CSV → SQLite
```

**Layer rule:** a router only calls its service; a service only calls its
repository or the loader; the repository only talks to SQLite. No layer
skips (router → repository is forbidden).
**Projection rule:** read queries must use explicit column lists (`SELECT col1, col2`), never `SELECT *`.

## 3. Endpoints

### Crypto (`/crypto`)
| Method | Path | Returns |
|---|---|---|
| GET | `/crypto/cycles` | bull/bear cycle history (start, end, return, duration) |
| GET | `/crypto/bear-markets` | bear market list (drawdown >= 20%) |
| GET | `/crypto/breakouts` | +3σ breakout forward returns study (30, 60, 120, 365d) |
| GET | `/crypto/breakout-dates` | historical breakout signal trigger dates |
| GET | `/crypto/drawdowns` | top-15 historical drawdowns with recovery metrics |
| GET | `/crypto/performance` | strategy vs buy & hold metrics |
| GET | `/crypto/equity-curve` | normalized equity curve series vs BTC and SPY benchmarks |

### Filings (`/filings`)
| Method | Path | Returns |
|---|---|---|
| GET | `/filings/holdings` | holdings (filterable by fund, quarter) |
| GET | `/filings/sector-weights` | sector weights (filterable by fund) |
| GET | `/filings/funds` | list of tracked 13F investment funds |

### Congress (`/congress`)
| Method | Path | Returns |
|---|---|---|
| GET | `/congress/trades` | trade feed (filterable by politician, ticker, party, date, alignment) |
| GET | `/congress/consensus` | per-ticker consensus ranked by net signed USD |
| GET | `/congress/consensus/monthly` | monthly net signed USD aggregate volume |
| GET | `/congress/committees` | committee alignment volume and signal summary |

### Ops (`/ops`)
| Method | Path | Returns |
|---|---|---|
| GET | `/ops/runs` | recent pipeline execution history (freshness) |
| POST | `/ops/run/{pipeline}` | trigger an asynchronous pipeline run |
| GET | `/ops/run/{pipeline}/status` | poll execution status for a specific pipeline |

### Database (`/db` & `/api/database`)
| Method | Path | Returns |
|---|---|---|
| GET | `/db/tables` | list of warehouse tables + row counts |
| GET | `/db/query` | AST sandboxed read-only `SELECT` query (GET) |
| POST | `/db/query` | AST sandboxed query returning rows + execution latency (POST) |

### Market (`/market`)
| Method | Path | Returns |
|---|---|---|
| GET | `/market/status` | Massive API connectivity and plan verification |
| GET | `/market/quotes` | L1 previous-close price bars (BTC, SPY, QQQ, IWM) |

### Telemetry & Health
| Method | Path | Returns |
|---|---|---|
| WS | `/ws/telemetry` | WebSocket real-time market quotes and pipeline state stream |
| GET | `/health` | liveness status probe |
| GET | `/health/ready` | readiness status probe (DB + Massive connectivity) |
| GET | `/metrics` | latency budget percentiles (p50, p95) and request counts |

## 4. Configuration

All config is environment-driven (see `.env.example`), read via `pydantic-settings`:

```python
class Settings(BaseSettings):
    database_url: str = "sqlite:///database/nussif.db"
    pipelines_dir: Path = REPO_ROOT
    enable_run_endpoint: bool = False
    run_timeout_seconds: int = 600
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    log_level: str = "INFO"
```

## 5. Security & AST Query Sandboxing

- **AST Read-Only Sandbox:** `/db/query` validates queries via AST syntax analysis. Only single `SELECT` statements are permitted. Mutations (`DROP`, `DELETE`, `INSERT`, `UPDATE`, `ALTER`, `CREATE`, etc.) or multiple chained statements (semicolon injection) are rejected with HTTP 403.
- **Connection Level Guard:** Database connections execute with `PRAGMA query_only = ON` during analytical queries.
- **Run Gating:** The `/ops/run/{pipeline}` endpoint returns HTTP 403 unless `NUSSIF_ENABLE_RUN_ENDPOINT=true` is explicitly set.

## 6. Observability & Latency Budget

- **Structured JSON Logging:** Requests log `request_id`, `method`, `path`, `status`, and `duration_ms`.
- **Metrics Endpoint:** `/metrics` reports rolling latency percentiles (p50, p95, p99) against the latency budget targets.
- **Automated Benchmarking:** `python backend/bench.py` hits every endpoint 100 times and records results to `docs/architecture/latency-bench.generated.json`.
