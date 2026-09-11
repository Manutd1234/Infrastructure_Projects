# Testing

## 1. Strategy

A testing pyramid weighted toward fast, deterministic unit tests, with a
layer of integration tests against the SQLite data warehouse, AST security checks,
and smoke tests for the trading desk dashboard.

```
            ┌────────────────────────┐
            │   E2E smoke (few)      │   browser-driven, fixture data
            └────────────────────────┘
        ┌────────────────────────────┐
        │  Integration (some)        │   backend + SQLite WAL DB; pipeline + fixture cache
        └────────────────────────────┘
    ┌────────────────────────────────────┐
    │  Unit (many)                        │   37 pytest tests, Pydantic schemas, AST parser
    └────────────────────────────────────┘
```

## 2. Layers

### 2.1 Unit Tests
- **Pipelines:** parsers (`dataroma_scraper.parse_history`,
  `capitol_trades_scraper.parse_trades_html`), the cycle detector, the
  breakout detector, the sector classifier's fallback, the consensus
  calculator. Pure functions; no I/O.
- **Backend:** 37 automated pytest cases covering health, readiness, crypto endpoints, filings,
  congress trades, pipeline ops, database queries, market status, and WebSocket telemetry tape.
- **AST Security:** dedicated unit tests validating that the AST parser rejects `DROP`, `DELETE`,
  `INSERT`, `UPDATE`, and semicolon-chained multi-statement injections.

### 2.2 Integration Tests
- **Backend + SQLite WAL:** hits each endpoint against `database/nussif.db`, asserting
  Pydantic response schema compliance, correct serialization, and response latency.
- **Schema Contracts:** every CSV in `*/outputs/` is validated against `database/schema.sql`.
- **WebSocket Telemetry:** integration test connecting to `/ws/telemetry`, receiving initial snapshot,
  and completing a bidirectional ping/pong cycle.

## 3. Test Suites & Commands

```bash
# Run all backend unit and integration tests
pytest backend/tests/ -v

# Run with coverage report
pytest --cov=backend --cov-report=term-missing

# Run latency benchmarking suite
python backend/bench.py

# Frontend typecheck & build
cd frontend && npm run build
```

## 4. Test Structure

```
backend/tests/
├── __init__.py
├── test_health.py       # liveness (/health), readiness (/health/ready), and /metrics
├── test_crypto.py       # cycles, bear markets, breakouts, drawdowns, equity curves
├── test_filings.py      # funds, holdings, sector weights (with filtering)
├── test_congress.py     # trades (filtered), consensus, monthly consensus, committees
├── test_ops.py          # pipeline runs history, status polling, trigger gating
├── test_db.py           # tables, safe queries, AST mutation & injection rejection
├── test_market.py       # status and L1 quotes
└── test_telemetry.py    # WebSocket tape subscription and ping/pong handling
```

## 5. Network Policy

- **No network required for core testing:** TestClient tests execute locally against SQLite WAL data.
- **Offline fallbacks:** Market endpoints fall back cleanly when external APIs are unavailable.
