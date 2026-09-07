# Tech Stack

## 1. Choices at a glance

| Layer | Technology | Version | Why |
|---|---|---|---|
| Pipelines | Python | 3.10+ | Standard data ecosystem; matches existing pipelines |
| Pipeline data | pandas, numpy | latest | De facto standard; the existing pipelines already use them |
| Pipeline stats | scipy | latest | t-test for the breakout study |
| Pipeline scraping | requests, beautifulsoup4, lxml | latest | Server-rendered HTML on Dataroma / Capitol Trades |
| Pipeline prices | yfinance | latest | Free, no API key, covers BTC + SPY |
| Pipeline charts | matplotlib | latest | Static PNGs for the whitepaper and dashboard |
| Backend | FastAPI | 0.110+ | Async, typed, OpenAPI; thin transport layer |
| Backend server | uvicorn | latest | ASGI server; matches FastAPI |
| Backend settings | pydantic-settings | latest | Env-driven, typed config |
| Backend DB driver | sqlite3 (stdlib) / SQLAlchemy 2 | latest | SQLite by default; Postgres-ready via SQLAlchemy |
| Database | SQLite | 3.40+ | Zero-ops; file-based; portable to Postgres |
| Frontend | React | 18+ | Component model; large ecosystem |
| Frontend lang | TypeScript | 5+ | Type safety; matches the typed backend |
| Frontend build | Vite | 5+ | Fast HMR; minimal config |
| Frontend styling | Tailwind CSS | 3+ | Utility-first; consistent without custom CSS |
| Frontend charts | Recharts | latest | Composable React charts; good defaults |
| Frontend data | @tanstack/react-query | latest | Server-state caching, refetch, stale-while-revalidate |
| Frontend routing | react-router | 6+ | Standard; nested routes |
| Notebooks | Jupyter | latest | Exploratory analysis; outputs stripped on commit |
| Whitepaper | Typst | latest | Modern typesetting; compiles fast; Mermaid support |
| Docs diagrams | Mermaid | latest | Renders on GitHub and in Typst |
| Lint / format (py) | ruff | latest | Replaces flake8 + black + isort |
| Lint / format (ts) | eslint + prettier | latest | Standard |
| Type check (py) | mypy --strict | latest | Strict on shared modules |
| Type check (ts) | tsc | 5+ | Built-in |
| Tests (py) | pytest | latest | Standard |
| Tests (ts) | vitest + @testing-library/react | latest | Vite-native |
| CI | GitHub Actions | — | Free for public repos; matrix builds |
| Scheduler (now) | cron | — | Simplest; no extra service |
| Scheduler (target) | Prefect | 2+ | Pythonic; observable; replaces cron when runs > 3 |

## 2. Why not…

- **DuckDB instead of SQLite:** great for analytics, but we already have
  pandas in the pipelines and SQLite is enough for the dashboard's read
  patterns. Revisit if we add heavy OLAP.
- **Postgres from day one:** operational overhead for a single-operator
  tool. The schema is portable; we switch when we need concurrent
  writers or > 1 GB of data.
- **Next.js instead of Vite + react-router:** Next.js's SSR is wasted on a
  dashboard that reads from a local API. Vite keeps the build simple.
- **D3 instead of Recharts:** D3 is more flexible but verbose; Recharts
  covers every chart we need with composable React.
- **Airflow instead of cron/Prefect:** Airflow's operational weight is
  unjustified for three pipelines. Prefect is the upgrade path if we
  outgrow cron.
- **A shared Python package across pipelines:** the three pipelines have
  different dependencies and release cadences; coupling them creates
  more pain than the dedup is worth.

## 3. Dependency boundaries

- Pipelines **must not** import from `backend/` or `frontend/`.
- Backend **must not** import from `` (CI import check
  enforces this). The backend reads CSVs and SQLite only.
- Frontend **must not** import from `backend/` Python; it consumes JSON.
- Notebooks **may** import from pipelines (they are exploratory).

## 4. Versioning

- Python dependencies pinned in each `requirements.txt` (pip-compile
  output). Major versions only in this doc.
- Frontend dependencies pinned in `frontend/package.json` with exact
  versions.
- The SQLite schema is versioned in `database/migrations/`; the current
  version is stored in `schema_version` table.

## 5. Security

- No secrets in code. All secrets via environment (`.env`, gitignored).
- `pip install` from PyPI only; no custom indexes.
- `npm install` from npm only; `npm audit` in CI.
- Frontend built with `npm run build` produces static assets; no
  runtime secrets in the bundle.
