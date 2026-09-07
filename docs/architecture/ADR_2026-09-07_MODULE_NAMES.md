# ADR 2026-09-07: Clearer module names

- **Status:** Accepted
- **Date:** 2026-09-07
- **Supersedes:** PascalCase names in `ADR_2026-09-07_MODULES_AT_ROOT.md`

## Decision

| Old | New | Why |
|---|---|---|
| `CryptoBullCycle` | `CryptoCycle` | Shorter; the folder is the cycle + breakout study, not only "bull" |
| `ThirteenFFilings` | `HedgeFund13F` | "ThirteenF" is awkward; 13F is the real term and these are hedge-fund books |
| `CongressTrading` | `CongressTrades` | This is a trade monitor, not a trading system |

## Compliance

`run_all.py`, `backend/loaders/ingest.py`, `backend/app/api/ops.py`,
and the dashboard Overview page use the same three names.
