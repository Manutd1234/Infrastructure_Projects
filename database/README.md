# Database

SQLite store for the platform. The default file is `nussif.db` in this
folder (gitignored). The schema is portable to Postgres with minor
column-type changes.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | Full DDL (tables, indexes, constraints). |
| `init_db.py` | Creates the SQLite file from `schema.sql`. Idempotent. |
| `migrations/` | Append-only migration scripts (one file per schema change). |

## Quickstart

```bash
python database/init_db.py          # creates database/nussif.db
```

## Tables

| Table | Grain | Source CSV |
|---|---|---|
| `pipeline_runs` | one row per pipeline execution | written by the backend loader |
| `crypto_cycles` | one row per bull/bear cycle | `CryptoCycle/outputs/cycles.csv` |
| `crypto_breakout` | one row per (signal_date, horizon) | `breakout_study.csv` |
| `crypto_breakout_dates` | one row per breakout date | `breakout_dates.csv` |
| `crypto_drawdowns` | one row per drawdown episode | `drawdowns.csv` |
| `crypto_performance` | one row per strategy | `performance.csv` |
| `fund_holdings` | fund × quarter × ticker | `holdings_with_sectors.csv` |
| `sector_weights` | fund × quarter × sector | `sector_weights.csv` |
| `funds` | one row per tracked fund | `HedgeFund13F/funds.py` |
| `congress_trades` | one row per trade | `trades_with_sectors.csv` |
| `ticker_consensus` | one row per ticker | `ticker_consensus.csv` |
| `monthly_consensus` | one row per month | `monthly_consensus.csv` |
| `committee_signals` | one row per committee per run | `committee_summary.csv` |
| `committee_sectors` | committee × sector | `committee_signals.py` mapping |
| `politician_committees` | politician × committee | `committee_signals.py` mapping |

See `docs/architecture/UML_DIAGRAMS.md` §4 for the entity-relationship
diagram.

## Migrations

Migrations are append-only. To change the schema:

1. Add a file `migrations/NN_description.sql` (zero-padded).
2. Run it against a copy of the DB, verify, commit.
3. Update `schema.sql` to reflect the new state (the canonical schema).

Never edit a shipped migration.

## Postgres migration

The schema uses SQLite types. To move to Postgres:
- `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`.
- `TEXT` for dates → `DATE` or `TIMESTAMP`.
- `REAL` → `DOUBLE PRECISION`.
- Add `:memory:` → connection-string config in `backend/app/core/config.py`.
