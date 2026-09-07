# System overview

The platform is organised in four layers:

1. **Data pipelines** (`data/pipelines/`) — three self-contained Python
   packages that fetch, parse, enrich, and analyse data from yfinance,
   Dataroma, and Capitol Trades. Each writes structured CSVs and PNG
   charts to its own `outputs/` folder.
2. **Database** (`database/`) — a SQLite store with a schema that
   mirrors the CSV contracts. A loader ingests pipeline outputs into the
   DB and records each run in `pipeline_runs`.
3. **Backend** (`backend/`) — a FastAPI application that serves the
   DB and CSVs as typed JSON. It contains no analytics; it is a thin
   transport layer.
4. **Frontend** (`frontend/`) — a React + TypeScript + Vite dashboard
   organised around five operational surfaces: Overview, Crypto,
   Filings, Congress, and Database.

The layering rule is strict: analytics live in the pipelines; the
backend and frontend are transport and presentation only. This keeps the
analytics reproducible from the pipeline code alone and prevents the
classic "logic smeared across three tiers" anti-pattern.

See `docs/architecture/ARCHITECTURE.md` for the full design and
`docs/architecture/UML_DIAGRAMS.md` for diagrams.
