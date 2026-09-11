# Current State

> Living document. Updated as work lands. Last updated: 2026-09-11.

## Status at a Glance

| Component | Status | Notes |
|---|---|---|
| `CryptoCycle` | **Production** | Pulls BTC + SPY, identifies 48 cycle episodes, runs +3σ breakout study, computes asymmetric drawdowns & recovery. Outputs CSV + PNG. |
| `HedgeFund13F` | **Production** | Scrapes 13F-HR filings for 8 funds (2006Q4 → 2026Q2), classifies GICS sectors, Active Share ($AS \ge 0.80$), smart money consensus. 6,333 positions indexed. |
| `CongressTrades` | **Production** | Ingests 720 STOCK Act disclosures across 39 politicians, computes Fama-French Cumulative Abnormal Returns ($CAR$), and flags committee jurisdictional conflicts. |
| `backend/` | **Production** | FastAPI async microservices with SQLite WAL mode (<1.6ms latency p95), typed Pydantic response models, AST read-only SQL query sandbox (`/db/query` & `/api/database/query`), 37 automated pytest cases, and WebSocket telemetry tape (`/ws/telemetry`). |
| `frontend/` | **Production** | Vite + React + TypeScript institutional trading desk. Unified subtab navigation system (`Tabs.tsx`), Schema Explorer height alignment, AST sandbox telemetry, and 6 specialized quantitative views. |
| `database/` | **Production** | SQLite WAL data warehouse with 17 normalized tables, 10,127 indexed rows, clustered B-tree secondary indices, and snapshot isolation. |
| `whitepaper/` | **Production** | 14-page publication-grade institutional whitepaper (`NUSSIF_Infrastructure_Projects_Whitepaper.pdf`) compiled via native Typst with econometric proofs, Markov models, and Taylor factor expansions. |
| `skills/` | **Working** | Specialized agent skills for database operations, data pipelines, and quantitative workflows. |
| `docs/` | **Production** | Exhaustive institutional architecture, UML sequence diagrams, latency budget benchmarks, and mathematical specifications. |

## What Works End-to-End Today

1. **Run any pipeline standalone**:
   ```bash
   cd CryptoCycle && python main.py
   cd HedgeFund13F && python main.py
   cd CongressTrades && python main.py
   ```
   Each writes normalized CSV tables and high-resolution PNG charts to its own `outputs/` folder.

2. **Initialize and inspect the warehouse**:
   ```bash
   python database/init_db.py
   python -m backend.loaders.ingest
   # 17 normalized tables, 10,127 indexed rows in SQLite WAL mode
   ```

3. **Start the backend API and telemetry tape**:
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   # Interactive docs at http://localhost:8000/docs
   # Real-time WebSocket telemetry tape at ws://localhost:8000/ws/telemetry
   ```

4. **Run automated test suites and benchmarks**:
   ```bash
   pytest backend/tests/ -v   # 37 passing unit & integration tests
   python backend/bench.py    # generates docs/architecture/latency-bench.generated.json
   ```

5. **Start the institutional trading desk**:
   ```bash
   cd frontend && npm run dev
   # Access live desk at http://localhost:5173
   ```

6. **Compile institutional whitepaper**:
   ```bash
   cd docs/whitepaper
   typst compile main.typ NUSSIF_Infrastructure_Projects_Whitepaper.pdf
   ```

## Production Architecture Highlights

- **Standardized Subtab Design System**: All 6 views share the unified `.subtab-nav-bar` system with fixed height (`37.6px`), institutional pill badges, and active drop-shadows.
- **Crypto Subtabs (Single-Row Flow)**: All 5 quantitative subtabs (`+3σ Breakout Study`, `Strategy Simulator`, `Cycle Episodes (48)`, `Drawdown & Recovery`, `Backtest vs B&H`) sit flush on a single line with zero horizontal overflow or truncation.
- **Database Schema Explorer Height Harmonization**: Bounded table list container (`max-h-[400px] overflow-y-auto scrollbar-inst`) and `items-start` grid alignment ensure the Schema Explorer card terminates cleanly at the same baseline as the SQL Statement Console and Query Results.
- **AST Security Sandbox**: User queries submitted to the SQL Console pass through an AST syntax parser, rejecting any non-SELECT mutations or chained statements before reaching the database engine.
- **Lockless Read Concurrency**: SQLite configured in `WAL` mode ensures real-time pipeline ingestion never blocks analytical read queries ($R_{readers} \parallel W_{writer} \implies \emptyset \text{ Contention}$).
- **Type-Safe Pydantic Microservices**: Endpoints are strictly typed with response models, producing an institutional OpenAPI schema for automatic client generation.
- **Streaming Telemetry Tape**: Low-latency WebSocket broadcasting cross-asset market quotes (`X:BTCUSD`, `SPY`, `QQQ`, `IWM`) and pipeline execution events directly to desk clients.

## Recent Changes

- **2026-09-11:** Completed full overhaul of backend FastAPI microservices: added typed Pydantic models for all 7 surfaces, enabled SQLite WAL mode with memory caching pragmas, enforced explicit SQL column projections, implemented AST query sandboxing for GET and POST `/db/query`, added WebSocket telemetry streaming tape (`/ws/telemetry`), built 37 automated tests with pytest, and produced institutional benchmark report (`latency-bench.generated.json`).
- **2026-09-11:** Cleaned up and synchronized institutional documentation across all architectural, planning, and product guides.
- **2026-09-07:** Compiled 14-page institutional Whitepaper PDF (`docs/whitepaper/NUSSIF_Infrastructure_Projects_Whitepaper.pdf`) with full mathematical proofs, Markov transition matrices, and empirical tables using Typst.
- **2026-09-07:** Harmonized Schema Explorer card height in `Database.tsx` to match the SQL Statement Console and Query Results baseline with smooth internal scrolling.
- **2026-09-07:** Completed full sweep across all 6 frontend views for 100% alignment, concise institutional copy, and zero visual bugs.
- **2026-09-07:** Unified subtab navigation system across all views with `.subtab-nav-bar` and fixed Crypto 5-tab ribbon layout.
- **2026-09-07:** Reorganized analysis modules to repository root (`CryptoCycle/`, `HedgeFund13F/`, `CongressTrades/`). Added live WAL warehouse with 10,127 indexed rows.
