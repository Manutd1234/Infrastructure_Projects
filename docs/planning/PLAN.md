# Plan

> Phased delivery plan. Updated as work lands. See `CURRENT_STATE.md` for
> the live status.

## Phases

### Phase 0 — Foundations (done)
- [x] Three analysis pipelines producing CSV + PNG outputs.
- [x] Each pipeline self-contained, runnable from its own folder.
- [x] Cached fetches; idempotent re-runs.

### Phase 1 — Repository Restructure (done)
- [x] Move the three analysis modules to the repo root as PascalCase
      folders (`CryptoCycle/`, `HedgeFund13F/`, `CongressTrades/`).
- [x] Add `backend/`, `frontend/`, `database/`, `notebooks/`, `docs/`,
      `skills/` folders.
- [x] Institutional documentation set in `docs/`.
- [x] `.env.example` and `.gitignore` updated.

### Phase 2 — Database (done)
- [x] `database/schema.sql` defines all 17 normalized tables and B-tree indexes.
- [x] `database/init_db.py` creates the SQLite file with WAL mode and memory cache tuning.
- [x] `backend/loaders/ingest.py` reads pipeline `outputs/*.csv` and loads 10,127 rows into SQLite.
- [x] Schema verification: all CSV outputs cleanly ingested into data warehouse.

### Phase 3 — Backend (done)
- [x] FastAPI microservices with routers for crypto, filings, congress, ops, db, market, telemetry.
- [x] Service + repository layering strictly enforced with explicit column projections.
- [x] `/health`, `/health/ready`, and `/metrics` latency tracking endpoints.
- [x] Strongly typed Pydantic models for all requests and responses; comprehensive OpenAPI documentation.
- [x] AST SQL security sandbox protecting ad-hoc database queries.
- [x] Real-time WebSocket telemetry tape (`/ws/telemetry`).
- [x] Bench script (`backend/bench.py`) writing `latency-bench.generated.json`.
- [x] 37 automated tests passing in `backend/tests/`.

### Phase 4 — Frontend (done)
- [x] Vite + React + TypeScript + Tailwind desk interface.
- [x] Overview page with status chips, L1 market quotes, and recent run audit trail.
- [x] Crypto page: cycles chart, breakout study, drawdown overlay, equity curves.
- [x] Filings page: sector rotation, factor replication, top holdings.
- [x] Congress page: trade feed, consensus, monthly trends, committee alignment.
- [x] Scenario Stress Test page: macroeconomic factor shocks and liquidity analysis.
- [x] Database page: console, schema explorer, storage engine telemetry.
- [x] Subtab navigation design system standardized across all 6 views.

### Phase 5 — Operations & Scheduling
- [ ] Cron schedule for the three pipelines.
- [x] Structured JSON logging to stdout; latency metrics endpoint.
- [ ] Automated backup script for `database/nussif.db`.

### Phase 6 — Auth and Exposure (future)
- [ ] OAuth on the backend; session cookie for the dashboard.
- [ ] Nginx reverse proxy with TLS cert rotation runbook.
- [ ] Rate limiting on `/ops/run/*`.

### Phase 7 — Whitepaper (done)
- [x] Populate `docs/whitepaper/sections/` with quantitative proofs and empirical results.
- [x] Compile 14-page publication-grade PDF (`NUSSIF_Infrastructure_Projects_Whitepaper.pdf`) via Typst.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dataroma / Capitol Trades change their HTML | Medium | Pipeline breaks | Offline cache ensures last good data stays available |
| yfinance rate limits | Low | Stale BTC data | Massive market data provider integration + cache |
| SQLite write contention under load | Low | API 5xx | SQLite WAL mode with snapshot isolation ensures lockless reads |
| Scope creep into trading | Medium | Regulated activity risk | PRD non-goals strictly enforced in code reviews |
