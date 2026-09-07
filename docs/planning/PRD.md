# Product Requirements Document (PRD)

## 1. Problem

The fund runs three distinct research efforts — a crypto cycle study, a
13F filings tracker, and a congress trading monitor — each currently
operating as a standalone Python script. The operator (a Trading Desk
Operations Engineer) has no single surface to:

- see whether each dataset is fresh,
- inspect the latest signals without opening a notebook,
- trigger a re-run when data is stale,
- replay an analysis with a different parameter.

Today these actions require opening a terminal, editing code, and reading
CSVs. This is slow, error-prone, and inaccessible to anyone who isn't the
pipeline author.

## 2. Personas

### 2.1 Trading Desk Operations Engineer (primary)
- Owns data freshness and signal quality.
- Comfortable with Python and SQL; does not want to write code for every
  routine check.
- Needs to spot stale data, broken pipelines, and unusual signals within
  30 seconds of opening the tool.

### 2.2 Research analyst (secondary)
- Wants to inspect a specific signal (e.g. "what is the latest committee
  alignment for Armed Services?") without re-running anything.
- Reads charts and tables; rarely edits.

### 2.3 External / institutional reader (tertiary)
- Reads the whitepaper and the product guide; never logs in.

## 3. Goals

1. **One dashboard** for all three pipelines' outputs.
2. **Freshness at a glance**: the Overview page shows, per pipeline, last
   run time, status, and row count.
3. **Trigger re-runs** from the dashboard (gated by a setting; off by
   default for safety).
4. **Filter and drill**: every table is filterable and every chart has a
   detail view.
5. **Reproducible**: every number on the dashboard is traceable to a CSV
   produced by a pipeline run.

## 4. Non-goals

- Not a trading system. No order placement, no broker connectivity.
- Not multi-user. No per-user state, no roles beyond "operator".
- Not real-time. Data is batch-processed on a schedule.

## 5. User stories

### 5.1 Freshness
- *As the operator, when I open the dashboard I want to see a green/yellow/red
  chip per pipeline so I know immediately whether to trust today's data.*
- *As the operator, I want to see the timestamp of the last successful run
  per pipeline so I can decide whether to trigger a refresh.*

### 5.2 Crypto
- *As the operator, I want to see the current BTC cycle phase (bull/bear)
  and the latest +3σ breakout, with forward-return drift stats.*
- *As the operator, I want to compare the breakout strategy's equity curve
  to BTC buy & hold and SPY.*

### 5.3 Filings
- *As the operator, I want to see a stacked sector-rotation chart per fund
  and a latest-quarter heatmap of fund × sector exposure.*
- *As the operator, I want to filter by fund and by quarter range.

### 5.4 Congress
- *As the operator, I want a live trade feed with filters by politician,
  party, ticker, and date.*
- *As the operator, I want a consensus table (top buys, top sells by net
  signed USD).*
- *As the operator, I want a committee-alignment view that shows, per
  committee, how many trades were in sectors it oversees.*

### 5.5 Ops
- *As the operator, I want to trigger a pipeline re-run with one click and
  see its status without leaving the dashboard.*
- *As the operator, I want a read-only SQL browser so I can sanity-check
  a row without opening a SQLite client.*

## 6. Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Overview page with per-pipeline status chips | P0 |
| FR-2 | Crypto page: cycles chart, breakout table, drawdown chart, equity curve, performance table | P0 |
| FR-3 | Filings page: per-fund rotation, aggregate rotation, heatmap, fund filter | P0 |
| FR-4 | Congress page: trade feed, consensus table, committee summary | P0 |
| FR-5 | Database page: table list, row counts, read-only query | P1 |
| FR-6 | "Run pipeline" button per pipeline, gated by `enable_run_endpoint` | P1 |
| FR-7 | All tables filterable; all charts have a detail drawer | P1 |
| FR-8 | Dark mode default; light mode toggle | P2 |
| FR-9 | Keyboard shortcut to refresh the current page | P2 |

## 7. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-1 | Dashboard p95 page load ≤ 1.0 s warm (see `LATENCY_BUDGET.md`) |
| NFR-2 | Backend p95 read endpoint ≤ 200 ms |
| NFR-3 | Pipeline run does not block the API (subprocess + status polling) |
| NFR-4 | All secrets via environment, never in code |
| NFR-5 | No analytics logic in the backend or frontend |
| NFR-6 | SQLite by default; schema portable to Postgres |

## 8. Success metrics

- **Time-to-freshness-check**: operator can determine data freshness in
  under 10 seconds of opening the dashboard (target).
- **Pipeline run rate**: ≥ 95% of scheduled runs succeed without manual
  intervention within the first 30 days.
- **Reproducibility**: 100% of dashboard numbers traceable to a CSV
  committed in the same release.

## 9. Release plan

See `planning/PLAN.md` for the phased delivery. P0 features ship first,
behind a feature flag for the run endpoint.
