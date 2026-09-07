# Latency Budget

How long each operation is allowed to take, and what we measure to verify it.

## 1. Why a latency budget

A Trading Desk Operations Engineer needs the dashboard to feel snappy and
needs pipeline runs to finish before the next market open. A latency budget
makes those expectations explicit and gives us numbers to regress against.

## 2. Targets

### 2.1 Dashboard interaction (user-perceived)

| Operation | Target p95 | Hard limit | Notes |
|---|---|---|---|
| Page navigation | 200 ms | 500 ms | Client-side routing; data fetch in parallel |
| Overview page load (cold) | 1.0 s | 2.0 s | Hits `/ops/runs` + per-pipeline status |
| Crypto page load (warm) | 400 ms | 800 ms | Charts render from cached JSON |
| Filings rotation chart | 600 ms | 1.5 s | Largest payload; consider pagination |
| Congress trade table (filtered) | 300 ms | 700 ms | Server-side filter + 100-row page |
| Ad-hoc DB query | 800 ms | 2.0 s | Capped at 1000 rows |

### 2.2 Backend API (server-perceived)

| Endpoint | Target p95 | Hard limit | Notes |
|---|---|---|---|
| `/health` | 10 ms | 50 ms | In-process |
| `/health/ready` | 50 ms | 200 ms | DB ping + run check |
| `/crypto/*` | 100 ms | 300 ms | Read from SQLite, indexed |
| `/filings/sector-weights` | 200 ms | 600 ms | Largest table; aggregate in DB |
| `/congress/trades` (filtered) | 150 ms | 400 ms | Composite index on (politician, traded) |
| `/ops/runs` | 100 ms | 300 ms | Last 50 rows |
| `/ops/run/{pipeline}` (return) | 200 ms | 500 ms | Spawns subprocess; returns run_id immediately |

### 2.3 Pipeline runs (batch)

| Pipeline | Target | Hard limit | Schedule |
|---|---|---|---|
| `crypto_bull_cycle` | 30 s | 90 s | Daily 06:00 |
| `thirteen_f_filings` (8 funds, cached) | 10 s | 60 s | Weekly Mon 08:00 |
| `thirteen_f_filings` (cold, 8 funds) | 4 min | 8 min | On cache miss |
| `congress_trading` (60 pages, cached) | 5 s | 30 s | Daily 09:00 |
| `congress_trading` (cold, 60 pages) | 90 s | 180 s | On cache miss |

## 3. Measurement

### 3.1 Continuous

- The backend logs `duration_ms` per request. A `/metrics` endpoint
  (Prometheus format, planned) exposes histograms per route.
- The dashboard records client-side timings via the `performance` API and
  logs slow interactions.

### 3.2 Bench

`architecture/latency-bench.generated.json` is produced by:

```bash
python backend/bench.py
```

It hits every GET endpoint 100 times against a populated SQLite DB and
writes p50/p95/p99 per route. Run it before and after any change that
touches the DB schema or indexes.

## 4. Where the budget goes (end-to-end dashboard load)

```
User clicks "Crypto" (0 ms)
  └─► React router transition (10 ms)
      └─► fetch /crypto/cycles (target 100 ms)
            └─► SQLite SELECT (target 30 ms, index on start_date)
                └─► JSON serialise (target 10 ms)
                    └─► network (target 20 ms localhost)
                        └─► React render (target 50 ms)
                            └─► Chart render (target 100 ms)
Total target: ~320 ms (well under the 400 ms warm target)
```

## 5. When the budget is breached

1. **Backend p95 > target for an endpoint:** add or fix an index; check the
   query plan with `EXPLAIN QUERY PLAN`. Do not move logic into the
   backend — fix the data shape.
2. **Pipeline run > hard limit:** check the cache hit rate; the most common
   cause is a cold cache after `cache/` was deleted. If it's genuinely slow
   on a warm cache, profile with `cProfile` and file an issue.
3. **Dashboard p95 > target:** check the network tab; if the backend is fast
   but the page is slow, the issue is render or payload size. Paginate or
   memoise.

## 6. Non-goals

- We do **not** target sub-millisecond latency. This is a research and
  monitoring tool, not a matching engine.
- We do **not** stream. All endpoints return complete JSON; pagination is
  the lever for large payloads.
