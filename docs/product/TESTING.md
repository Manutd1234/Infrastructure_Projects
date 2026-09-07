# Testing

## 1. Strategy

A testing pyramid weighted toward fast, deterministic unit tests, with a
thin layer of integration tests against a fixture SQLite DB and a small
set of end-to-end smoke tests for the dashboard.

```
            ┌────────────────────────┐
            │   E2E smoke (few)      │   browser-driven, fixture data
            └────────────────────────┘
        ┌────────────────────────────┐
        │  Integration (some)        │   backend + fixture DB; pipeline + fixture cache
        └────────────────────────────┘
    ┌────────────────────────────────────┐
    │  Unit (many)                        │   pure functions, parsers, services
    └────────────────────────────────────┘
```

## 2. Layers

### 2.1 Unit tests
- **Pipelines:** parsers (`dataroma_scraper.parse_history`,
  `capitol_trades_scraper.parse_trades_html`), the cycle detector, the
  breakout detector, the sector classifier's fallback, the consensus
  calculator. Pure functions; no I/O.
- **Backend:** services with a mocked repository; the repository with a
  temporary SQLite file (`tmp_path`).
- **Frontend:** components with `@testing-library/react`; mock the API
  with MSW.

### 2.2 Integration tests
- **Pipeline + fixture cache:** run each pipeline's `main()` against a
  committed `tests/fixtures/<pipeline>/cache/` and assert the output
  CSVs match golden snapshots. No network.
- **Backend + DB:** stand up a fixture SQLite, hit each endpoint, assert
  shape and a few key values. Run the loader, assert rows appear.
- **Schema check:** every CSV in `*/outputs/` is read and
  its header compared to `database/schema.sql`. Catches contract drift.

### 2.3 E2E smoke tests
- A Playwright script that boots the backend and frontend, opens the
  dashboard, navigates each page, and asserts the title and one chart
  render. Run nightly and on `main` pushes.
- A `--smoke` flag on each pipeline that runs against the fixture cache
  (no network) and asserts non-empty output.

## 3. Coverage targets

| Layer | Target | Enforced by |
|---|---|---|
| Pipelines | 80% line | `pytest --cov` gate in CI |
| Backend | 85% line | `pytest --cov` gate in CI |
| Frontend | 70% line | `vitest --coverage` gate in CI |
| Shared modules (sector classifier, backtest engine) | 90% line | strict gate |

Coverage is a floor, not a target. A PR that drops coverage below the
gate fails CI.

## 4. Fixtures

```
tests/
├── fixtures/
│   ├── crypto_bull_cycle/
│   │   └── cache/
│   │       ├── BTC-USD.csv
│   │       └── SPY.csv
│   ├── thirteen_f_filings/
│   │   └── cache/
│   │       ├── BRK.html
│   │       └── psc.html
│   └── congress_trading/
│       └── cache/
│           └── trades.csv
├── pipelines/
├── backend/
└── frontend/
```

Fixtures are committed (small, curated slices of real data) so tests are
deterministic and offline.

## 5. Network policy

- **No network in unit or integration tests.** Network calls are mocked.
- **One network smoke test** per pipeline, run weekly in a separate CI
  job, allowed to fail (alerts but doesn't block). This catches upstream
  HTML drift early.

## 6. Performance tests

- `backend/bench.py` writes `latency-bench.generated.json` (see
  `LATENCY_BUDGET.md`). Run on every backend PR; fail if any endpoint's
  p95 regresses by > 20%.
- No frontend perf test yet; target a Lighthouse CI check once the
  dashboard is end-to-end.

## 7. Test commands

```bash
# all
pytest                                    # pipelines + backend
cd frontend && npm test                   # frontend
npm run test:e2e                           # playwright (nightly)

# with coverage
pytest --cov=backend --cov=CryptoBullCycle --cov=ThirteenFFilings --cov=CongressTrading --cov-report=html

# smoke a single pipeline offline
cd CryptoBullCycle && python main.py --smoke
```

## 8. Reviewing tests

A PR that adds a feature must add tests. A PR that fixes a bug must add a
regression test that fails before the fix. Reviewers reject PRs that
lower coverage below the gate or that introduce network calls in unit
tests.
