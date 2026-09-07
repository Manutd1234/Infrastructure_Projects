#import "../template.typ": *

= System Architecture & Data Plane

The Infrastructure Projects platform is engineered as a decoupled, multi-tiered infrastructure separating data acquisition, persistent normalization, analytical calculation, and presentation.

#v(8pt)

== Multi-Tier Ingestion & Storage Topology

#callout(title: "Architecture Theorem: Decoupled Ingestion & Lockless Reads", [
  Let $W_t$ represent write operations produced by autonomous background pipeline tasks and $R_t$ represent analytical read queries issued by trading analysts. By configuring the SQLite underlying engine in Write-Ahead Logging (`WAL`) mode with persistent busy-handlers, write serialization does not block read transactions:
  $ R_t parallel W_t ==> emptyset "Contention" $
  Read transactions operate on point-in-time snapshot isolations without acquiring table-level exclusive locks.
])

#v(8pt)

=== Normalized Relational Schema

The operational data warehouse maintains 17 normalized relations indexed via B-Tree secondary indices. Queries over primary identifier keys achieve $O(log_B N)$ latency:

#table(
  columns: (1.5fr, 1fr, 3fr),
  table.header([*Relation Name*], [*Row Count*], [*Description & Indexing Key*]),
  [`pipeline_runs`], [6], [ETL execution audit telemetry, execution logs, and run status.],
  [`funds`], [8], [Institutional fund metadata (CIK, fund manager, mandate).],
  [`fund_holdings`], [6,333], [Historical CUSIP positions, shares held, and market valuations.],
  [`sector_weights`], [2,618], [Quarterly aggregated sector allocations ($w_(k,t)$) across funds.],
  [`ticker_consensus`], [265], [Aggregated smart-money institutional ownership consensus.],
  [`congress_trades`], [720], [STOCK Act disclosed transactions, tickers, amounts, and dates.],
  [`politician_committees`], [0], [Legislator committee assignments and legislative jurisdictions.],
  [`committee_sectors`], [0], [Mapping of congressional committees to GICS sector domains.],
  [`committee_signals`], [15], [High-conviction informational asymmetry trading signals.],
  [`crypto_cycles`], [48], [Empirical 4-year halving cycle episodes, peak/trough dates.],
  [`crypto_breakouts`], [4], [Historical $+3sigma$ multi-day expansion breakout events.],
  [`crypto_breakout_dates`], [79], [Daily return trajectories following volatility corridor triggers.],
  [`crypto_drawdowns`], [15], [Peak-to-trough cycle drawdowns and historical recovery durations.],
  [`crypto_performance`], [3], [Risk-adjusted benchmark returns (Sharpe, Calmar, Max DD).]
)

#v(10pt)

== Telemetry & Real-Time Desk Streaming

The application server employs an asynchronous event loop (`FastAPI` + `Uvicorn`) maintaining a low-latency WebSocket connection (`/ws/telemetry`) streaming market tape updates and pipeline state transitions to client instances:

```python
# Lockless WAL Connection Factory with Snapshot Isolation
import sqlite3

def get_db_connection(db_path: str = "data/warehouse.db") -> sqlite3.Connection:
    conn = sqlite3.connect(db_path, timeout=30.0, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    conn.execute("PRAGMA cache_size = -64000;")  # 64MB memory cache
    conn.execute("PRAGMA temp_store = MEMORY;")
    return conn
```
