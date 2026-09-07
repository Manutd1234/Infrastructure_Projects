# ADR 2026-09-07: Restructure into a layered platform

- **Status:** Superseded (the "move into `data/pipelines/`" part is
  reversed by `ADR_2026-09-07_MODULES_AT_ROOT.md`; the layered-platform
  decision stands)
- **Date:** 2026-09-07

## Context

The repository started as three independent analysis scripts (crypto cycle,
13F filings, congress trading), each runnable from its own folder. As the
scope grew to include a dashboard, an API, and a database, the flat layout
became hard to navigate and made the boundaries between transport,
presentation, and analytics ambiguous.

## Decision

Restructure the repository into a layered platform:

```
Infrastructure_Projects/
├──       # analytics (source of truth)
├── backend/             # FastAPI transport (no analytics)
├── frontend/            # React presentation (no analytics)
├── database/            # SQLite schema + init
├── notebooks/           # exploratory analysis
├── docs/                # this documentation
└── skills/              # Cursor agent skills
```

The three existing analysis projects move into `` and keep
their self-contained, runnable shape. The backend serves their CSV outputs
without recomputing. The frontend renders backend JSON without computing.

## Consequences

- **Positive:** clear separation of concerns; each layer can be developed,
  tested, and replaced independently; analytics remain reproducible from
  the pipeline code alone.
- **Positive:** the dashboard and API can be developed against stable CSV
  contracts without waiting for pipelines to be "productionised".
- **Negative:** an extra hop (CSV → SQLite → JSON → React) for every byte
  of data. Acceptable for a research tool; would not be acceptable for a
  real-time system.
- **Negative:** pipeline authors must respect the CSV schemas in
  `docs/architecture/DATA_PROCESSING_FLOW.md` or the loader breaks. CI
  schema tests mitigate this.

## Alternatives considered

1. **Keep flat layout, add a `web/` folder.** Rejected — invites logic
   smeared across tiers; no clear contract between analytics and UI.
2. **Monorepo with shared Python package.** Rejected for now — the three
   pipelines have different dependencies (yfinance vs BeautifulSoup vs
   requests) and different release cadences; a shared package would
   couple them.
3. **Microservices per pipeline.** Rejected — massive operational overhead
   for a single-operator tool.

## Compliance

- `*/main.py` must write the CSVs listed in
  `DATA_PROCESSING_FLOW.md` §3.
- `backend/` must not import from `` (enforced by CI import
  check).
- `frontend/` must not import from `backend/` Python; it consumes JSON only.
