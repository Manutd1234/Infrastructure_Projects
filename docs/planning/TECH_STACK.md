# Tech Stack

## 1. Choices at a glance

| Layer | Technology | Version | Why |
|---|---|---|---|
| Pipelines | Python | 3.10+ | Standard quantitative data ecosystem |
| Pipeline data | pandas, numpy | latest | De facto standard for tabular data and array operations |
| Pipeline stats | scipy | latest | Student's t-test for +3σ breakout forward return study |
| Pipeline scraping | requests, beautifulsoup4, lxml | latest | Fast HTML parsing for Dataroma and Capitol Trades |
| Pipeline prices | yfinance, Massive | latest | Dual provider: yfinance fallback, Massive aggregates |
| Pipeline charts | matplotlib | latest | High-resolution PNGs for whitepaper and dashboard |
| Backend | FastAPI | 0.110+ | Asynchronous, typed, OpenAPI, WebSocket support |
| Backend server | uvicorn | latest | High-throughput ASGI server |
| Backend settings | pydantic-settings | latest | Env-driven, strictly typed configuration |
| Backend schemas | pydantic | 2.5+ | Strong request/response models and OpenAPI documentation |
| Backend DB driver | sqlite3 (stdlib) | latest | SQLite WAL mode with memory caching pragmas |
| Database | SQLite | 3.40+ | Zero-ops; WAL mode for snapshot isolation; portable |
| Frontend | React | 18+ | Declarative component model and rich ecosystem |
| Frontend lang | TypeScript | 5+ | End-to-end type safety matching backend schemas |
| Frontend build | Vite | 5+ | Millisecond HMR and optimized production bundling |
| Frontend styling | Tailwind CSS | 3+ | Utility-first design system with institutional styling |
| Frontend charts | Recharts | latest | Composable React charts with SVG animations |
| Frontend data | @tanstack/react-query | latest | Server-state caching and stale-while-revalidate |
| Frontend routing | react-router | 6+ | Nested layout routing and browser history management |
| Whitepaper | Typst | latest | Modern typesetting compiling publication-grade PDF |
| Test framework | pytest | 8+ | Fast test runner for unit, integration, and AST tests |
| HTTP testing | httpx / TestClient | latest | Async ASGI testing without real network dependency |
| Lint / format (py) | ruff | latest | Ultra-fast linter and formatter |
| Type check (ts) | tsc | 5+ | Strict TypeScript compiler |

## 2. Why not…

- **DuckDB instead of SQLite:** great for OLAP analytics, but we already have
  pandas in the pipelines and SQLite WAL is fast (<2ms) for the dashboard's read
  patterns.
- **Postgres from day one:** unnecessary operational overhead for a single-operator
  tool. The schema is portable; we switch when we need multi-server concurrent
  writers or > 10 GB of data.
- **Next.js instead of Vite + react-router:** SSR adds unnecessary operational complexity
  for an operations dashboard that reads from a local API. Vite keeps the build fast and simple.
- **D3 instead of Recharts:** D3 is more flexible but verbose; Recharts
  covers all quantitative chart needs with composable React.

## 3. Dependency boundaries

- Pipelines **must not** import from `backend/` or `frontend/`.
- Backend **must not** import from analysis modules (`CryptoCycle`, `HedgeFund13F`, `CongressTrades`) (CI import check enforces this). The backend reads CSVs and SQLite only.
- Frontend **must not** import from `backend/` Python; it consumes JSON over HTTP and WebSocket frames.
- Notebooks **may** import from pipelines (they are exploratory).

## 4. Versioning

- Python dependencies pinned in `requirements.txt` and `backend/requirements.txt`.
- Frontend dependencies pinned in `frontend/package.json`.
- SQLite schema is versioned in `database/schema.sql` and tracked in `schema_version`.

## 5. Security

- No secrets in code. All secrets configured via environment (`.env`, gitignored).
- AST SQL parser guards `/db/query` against mutations and SQL injection.
- Pydantic models validate all incoming request bodies and query parameters.
