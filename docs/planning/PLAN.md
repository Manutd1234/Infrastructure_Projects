# Plan

> Phased delivery plan. Updated as work lands. See `CURRENT_STATE.md` for
> the live status.

## Phases

### Phase 0 — Foundations (done)
- [x] Three analysis pipelines producing CSV + PNG outputs.
- [x] Each pipeline self-contained, runnable from its own folder.
- [x] Cached fetches; idempotent re-runs.

### Phase 1 — Repository restructure (done)
- [x] Move the three analysis modules to the repo root as PascalCase
      folders (`CryptoBullCycle/`, `ThirteenFFilings/`, `CongressTrading/`).
- [x] Add `backend/`, `frontend/`, `database/`, `notebooks/`, `docs/`,
      `skills/` folders.
- [x] Institutional documentation set in `docs/`.
- [x] `.env.example` and `.gitignore` updated.

### Phase 2 — Database (in progress)
- [ ] `database/schema.sql` defines all tables.
- [ ] `database/init_db.py` creates the SQLite file and indexes.
- [ ] `backend/loaders/ingest.py` reads pipeline `outputs/*.csv` and
      loads into SQLite, writing a `pipeline_runs` row per load.
- [ ] Schema test: every CSV in `*/outputs/` matches a
      table.

### Phase 3 — Backend (in progress)
- [ ] FastAPI app with routers for crypto, filings, congress, ops, db.
- [ ] Service + repository layering enforced.
- [ ] `/health` and `/health/ready`.
- [ ] OpenAPI spec generated; frontend generated against it.
- [ ] Bench script writes `latency-bench.generated.json`.

### Phase 4 — Frontend (in progress)
- [ ] Vite + React + TypeScript + Tailwind scaffold.
- [ ] Overview page with status chips.
- [ ] Crypto page: cycles chart, breakout table, drawdown, equity curve.
- [ ] Filings page: rotation, heatmap, fund filter.
- [ ] Congress page: trade feed, consensus, committee.
- [ ] Database page: table browser.
- [ ] "Run pipeline" button (gated by `enable_run_endpoint`).

### Phase 5 — Operations
- [ ] Cron schedule for the three pipelines.
- [ ] Structured logs to stdout; `/metrics` Prometheus endpoint.
- [ ] `engineering/TLS_FLIP.md` runbook validated.
- [ ] Backup script for `database/nussif.db`.

### Phase 6 — Auth and exposure (future)
- [ ] OAuth on the backend; session cookie for the dashboard.
- [ ] Nginx in front with the TLS runbook applied.
- [ ] Rate limiting on `/ops/run/*`.
- [ ] Audit log for run triggers.

### Phase 7 — Whitepaper (future)
- [ ] Populate `docs/whitepaper/sections/` with results from the latest
      pipeline outputs.
- [ ] Compile Typst to PDF in CI; attach as a release artifact.

## Sequencing rationale

Phases 2 and 3 are parallel: the backend can be developed against the CSV
contracts (which already exist) while the database loader is written.
Phase 4 depends on Phase 3 for the API contract. Phase 5 starts once the
dashboard is usable end-to-end. Phase 6 is gated on a decision to expose
the tool beyond the operator's machine.

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Dataroma / Capitol Trades change their HTML | Medium | Pipeline breaks | Smoke tests in CI; cache means last good data stays available |
| yfinance rate limits | Low | Stale BTC data | Cache + daily schedule; fall back to CoinGecko if needed |
| SQLite write contention under load | Low | API 5xx | Single writer (loader); readers are read-only |
| Scope creep into trading | Medium | Project becomes a regulated activity | PRD §4 non-goals enforced in review |

## Definition of done (per phase)

- All checklist items for the phase are merged.
- `CURRENT_STATE.md` updated.
- Relevant `docs/` sections updated.
- Smoke tests pass in CI.
- One other person has run the dashboard end-to-end on their machine.
