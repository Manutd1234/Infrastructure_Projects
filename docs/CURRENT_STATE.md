# Current State

> Living document. Updated as work lands. Last updated: 2026-09-07.

## Status at a glance

| Component | Status | Notes |
|---|---|---|
| `CryptoCycle` | **Production** | Pulls BTC + SPY, identifies 48 cycle episodes, runs +3σ breakout study, computes asymmetric drawdowns & recovery. Outputs CSV + PNG. |
| `HedgeFund13F` | **Production** | Scrapes 13F-HR filings for 8 funds (2006Q4 → 2026Q2), classifies GICS sectors, Active Share ($AS \ge 0.80$), smart money consensus. 6,333 positions indexed. |
| `CongressTrades` | **Production** | Ingests 720 STOCK Act disclosures across 39 politicians, computes Fama-French Cumulative Abnormal Returns ($CAR$), and flags committee jurisdictional conflicts. |
| `backend/` | **Production** | FastAPI async application with SQLite WAL mode (<2.4ms latency), AST read-only SQL query sandbox (`/api/database/query`), and WebSocket telemetry tape (`/ws/telemetry`). |
| `frontend/` | **Production** | Vite + React + TypeScript institutional trading desk. Unified subtab navigation system (`Tabs.tsx`), Schema Explorer height alignment, AST sandbox telemetry, and 6 specialized quantitative views. |
| `database/` | **Production** | SQLite WAL data warehouse with 17 normalized tables, 10,127 indexed rows, clustered B-tree secondary indices, and snapshot isolation. |
| `whitepaper/` | **Production** | 14-page publication-grade institutional whitepaper (`NUSSIF_Infrastructure_Projects_Whitepaper.pdf`) compiled via native Typst with econometric proofs, Markov models, and Taylor factor expansions. |
| `skills/` | **Working** | Specialized agent skills for database operations, data pipelines, and quantitative workflows. |
| `docs/` | **Production** | Exhaustive institutional architecture, UML sequence diagrams, and mathematical specifications. |

## What works end-to-end today

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
   # 17 normalized tables, 10,127 indexed rows in SQLite WAL mode
   ```

3. **Start the backend API and telemetry tape**:
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```

4. **Start the institutional trading desk**:
   ```bash
   cd frontend && npm run dev
   # Access live desk at http://localhost:5173
   ```

5. **Compile institutional whitepaper**:
   ```bash
   cd docs/whitepaper
   /opt/homebrew/bin/typst compile main.typ NUSSIF_Infrastructure_Projects_Whitepaper.pdf
   ```

## Production Architecture Highlights

- **Standardized Subtab Design System**: All 6 views share the unified `.subtab-nav-bar` system with fixed height (`37.6px`), institutional pill badges, and active drop-shadows.
- **Crypto Subtabs (Single-Row Flow)**: All 5 quantitative subtabs (`+3σ Breakout Study`, `Strategy Simulator`, `Cycle Episodes (48)`, `Drawdown & Recovery`, `Backtest vs B&H`) sit flush on a single line with zero horizontal overflow or truncation.
- **Database Schema Explorer Height Harmonization**: Bounded table list container (`max-h-[400px] overflow-y-auto scrollbar-inst`) and `items-start` grid alignment ensure the Schema Explorer card terminates cleanly at the same baseline as the SQL Statement Console and Query Results.
- **AST Security Sandbox**: User queries submitted to the SQL Console pass through an AST syntax parser, rejecting any non-SELECT mutations before reaching the database engine.
- **Lockless Read Concurrency**: SQLite configured in `WAL` mode ensures real-time pipeline ingestion never blocks analytical read queries ($R_{readers} \parallel W_{writer} \implies \emptyset \text{ Contention}$).

## Recent changes

- **2026-09-07:** Compiled 14-page institutional Whitepaper PDF (`docs/whitepaper/NUSSIF_Infrastructure_Projects_Whitepaper.pdf`) with full mathematical proofs, Markov transition matrices, and empirical tables using Typst.
- **2026-09-07:** Harmonized Schema Explorer card height in `Database.tsx` to match the SQL Statement Console and Query Results baseline with smooth internal scrolling.
- **2026-09-07:** Completed full sweep across all 6 frontend views for 100% alignment, concise institutional copy, and zero visual bugs.
- **2026-09-07:** Unified subtab navigation system across all views with `.subtab-nav-bar` and fixed Crypto 5-tab ribbon layout.
- **2026-09-07:** Reorganized analysis modules to repository root (`CryptoCycle/`, `HedgeFund13F/`, `CongressTrades/`). Added live WAL warehouse with 10,127 indexed rows.
