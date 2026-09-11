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
| Ad-hoc DB query | 800 ms | 2.0 s | AST sandboxed, capped at 1000 rows |

### 2.2 Backend API (server-perceived)

| Endpoint | Target p95 | Hard limit | Measured p95 (2026-09-11) |
|---|---|---|---|
| `/health` | 10 ms | 50 ms | **1.71 ms** |
| `/health/ready` | 50 ms | 200 ms | **3.80 ms** |
| `/crypto/*` | 100 ms | 300 ms | **1.67 ms** |
| `/filings/sector-weights` | 200 ms | 600 ms | **6.12 ms** |
| `/congress/trades` (filtered) | 150 ms | 400 ms | **3.45 ms** |
| `/ops/runs` | 100 ms | 300 ms | **1.85 ms** |
| `/ops/run/{pipeline}` (return) | 200 ms | 500 ms | **2.10 ms** (async thread spawn) |

### 2.3 Pipeline runs (batch)

| Pipeline | Target | Hard limit | Schedule |
|---|---|---|---|
| `CryptoCycle` | 30 s | 90 s | Daily 06:00 |
| `HedgeFund13F` (8 funds, cached) | 10 s | 60 s | Weekly Mon 08:00 |
| `HedgeFund13F` (cold, 8 funds) | 4 min | 8 min | On cache miss |
| `CongressTrades` (60 pages, cached) | 5 s | 30 s | Daily 09:00 |
| `CongressTrades` (cold, 60 pages) | 90 s | 180 s | On cache miss |

## 3. Measurement

### 3.1 Continuous

- The backend logs `duration_ms` per request and outputs an `x-duration-ms` HTTP response header.
- The `/metrics` endpoint exposes runtime quantile summaries (`p50_duration_ms`, `p95_duration_ms`) and endpoint hit counts.

### 3.2 Automated Benchmark Runner

Run the benchmark suite across all endpoints:

```bash
python backend/bench.py
```

Results are serialised to [`docs/architecture/latency-bench.generated.json`](latency-bench.generated.json), measuring min, p50, p95, p99, and max latencies over 100 iterations per endpoint.

## 4. Where the budget goes (end-to-end dashboard load)

```
User clicks "Crypto" (0 ms)
  └─► React router transition (10 ms)
      └─► fetch /crypto/cycles (target 100 ms, actual ~2 ms)
            └─► SQLite SELECT (target 30 ms, actual ~0.8 ms in WAL mode)
                └─► JSON serialise (target 10 ms, actual ~0.4 ms)
                    └─► network (target 20 ms localhost)
                        └─► React render (target 50 ms)
                            └─► Chart render (target 100 ms)
Total target: ~320 ms (measured cold load: <120 ms)
```

## 5. When the budget is breached

1. **Backend p95 > target for an endpoint:** add or fix a B-tree index in `database/schema.sql`; check the query plan with `EXPLAIN QUERY PLAN`.
2. **Pipeline run > hard limit:** check the cache hit rate; the most common cause is a cold cache after `cache/` was deleted.
3. **Dashboard p95 > target:** check client render cycles, memoise calculations, or paginate large payloads.
