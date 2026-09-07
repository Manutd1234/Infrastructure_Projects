# Frontend — Trading Desk Dashboard

React + TypeScript + Vite + Tailwind dashboard for the Trading Desk
Operations Engineer. Reads from the FastAPI backend via the Vite dev
proxy (`/api` → `http://localhost:8000`).

## Layout

```
frontend/
├── src/
│   ├── App.tsx             # shell + router
│   ├── main.tsx            # entry (QueryClientProvider, BrowserRouter)
│   ├── index.css          # Tailwind + desk theme
│   ├── lib/api.ts         # typed API client + shared types
│   ├── pages/
│   │   ├── Overview.tsx    # pipeline health + recent runs
│   │   ├── Crypto.tsx      # cycles, breakouts, drawdowns, performance
│   │   ├── Filings.tsx     # sector rotation, latest-quarter table
│   │   ├── Congress.tsx    # trade feed, consensus, committee alignment
│   │   └── Database.tsx    # read-only SQL browser
│   └── components/
├── index.html
├── vite.config.ts          # /api proxy to backend
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
└── package.json
```

## Quickstart

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

Make sure the backend is running (`uvicorn backend.app.main:app --reload`)
and the database has been initialised and loaded
(`python database/init_db.py && python -m backend.loaders.ingest`).

## The five surfaces

| Page | Purpose |
|---|---|
| Overview | Pipeline health chips (🟢/🟡/🔴), last-run times, recent runs table, "Run now" button per pipeline |
| Crypto | Bull/bear cycle table, +3σ breakout bar chart vs baseline, top drawdowns, strategy vs buy & hold metrics |
| Filings | Stacked sector-rotation bar chart per fund, latest-quarter sector exposure table, fund selector |
| Congress | Filterable trade feed, per-ticker consensus table, monthly net signed USD bar chart, committee alignment table |
| Database | Table list with row counts, read-only SQL box (SELECT only), CSV export |

See `docs/product/PRODUCT_GUIDE.md` for the operator's manual and
`docs/product/FEATURE_TOUR.md` for the feature walkthrough.

## Theme

Dark by default (`dark` class on `<html>`). A Bloomberg-terminal-meets-modern-SaaS
aesthetic: glassmorphic panels over a subtle blue/violet radial-gradient
backdrop, gradient-text headings, traffic-light status chips with glowing
dots, gradient primary buttons, and a `⌘K` command palette for fast
navigation. Tailwind tokens under the `desk-` prefix are retained for
back-compat; the new look lives in `src/index.css`.

## State

- **Server state:** `@tanstack/react-query`. The Overview page polls
  `/ops/runs` every 5s so the status chips stay live.
- **Client state:** React `useState` for filters; no global store yet.
  Add `zustand` only when shared filters across pages are needed.

## Build

```bash
npm run build        # tsc --noEmit + vite build -> dist/
npm run preview      # serve the production build
```

The built `dist/` is a set of static assets that Nginx can serve behind
the TLS runbook in `docs/engineering/TLS_FLIP.md`.
