---
name: start-trading-desk
description: Start the full Trading Desk stack (database, backend API, frontend dashboard). Use when the user asks to start the dashboard, boot the stack, or open the trading desk.
---

# Start the Trading Desk stack

Boot the database, backend API, and frontend dashboard so the operator
can use the Trading Desk.

## Steps

1. Ensure the database exists and is loaded:
   ```bash
   python database/init_db.py
   python -m backend.loaders.ingest
   ```
   (Both are idempotent; safe to re-run.)

2. Start the backend API in the background:
   ```bash
   uvicorn backend.app.main:app --reload --port 8000
   ```
   Verify with `curl http://localhost:8000/health` — expect `{"status":"ok"}`.

3. Start the frontend dashboard in the background:
   ```bash
   cd frontend && npm install && npm run dev
   ```
   The dashboard is at http://localhost:5173.

4. Tell the user the dashboard URL and the API docs URL
   (http://localhost:8000/docs).

## Notes

- If `npm install` has already been run, skip it.
- If a port is already in use, report it and ask the user whether to
  kill the existing process or use a different port.
- Do not enable `NUSSIF_ENABLE_RUN_ENDPOINT` unless the user asks — the
  "Run now" button on the dashboard will return 403 by default.
