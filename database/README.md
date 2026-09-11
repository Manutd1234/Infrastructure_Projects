# Database

SQLite data warehouse for the NUSSIF platform. The default file is `nussif.db` in this
folder (gitignored). The schema is normalized, indexed with clustered B-tree secondary indexes,
and operates in Write-Ahead Logging (`WAL`) mode for lockless read concurrency.

## Files

| File | Purpose |
|---|---|
| `schema.sql` | Full DDL (17 tables, indexes, check constraints, foreign keys). |
| `init_db.py` | Creates the SQLite file from `schema.sql` with WAL mode and PRAGMA settings. Idempotent. |
| `migrations/` | Append-only migration scripts (one file per schema change). |

## Quickstart

```bash
# Initialise the database with WAL mode and institutional PRAGMAs
python database/init_db.py

# Drop and recreate schema from scratch
python database/init_db.py --reset
```

## Tables

| Table | Grain | Source CSV |
|---|---|---|
| `pipeline_runs` | one row per pipeline execution | written by the backend loader |
| `crypto_cycles` | one row per bull/bear cycle | `CryptoCycle/outputs/cycles.csv` |
| `crypto_breakouts` | one row per horizon (30, 60, 120, 365 days) | `CryptoCycle/outputs/breakout_study.csv` |
| `crypto_breakout_dates` | one row per breakout date | `CryptoCycle/outputs/breakout_dates.csv` |
| `crypto_drawdowns` | one row per drawdown episode | `CryptoCycle/outputs/drawdowns.csv` |
| `crypto_performance` | one row per strategy | `CryptoCycle/outputs/performance.csv` |
| `fund_holdings` | fund × quarter × ticker | `HedgeFund13F/outputs/holdings_with_sectors.csv` |
| `sector_weights` | fund × quarter × sector | `HedgeFund13F/outputs/sector_weights.csv` |
| `funds` | one row per tracked fund | `HedgeFund13F/funds.py` |
| `congress_trades` | one row per trade | `CongressTrades/outputs/trades_with_sectors.csv` |
| `ticker_consensus` | one row per ticker | `CongressTrades/outputs/ticker_consensus.csv` |
| `monthly_consensus` | one row per month | `CongressTrades/outputs/monthly_consensus.csv` |
| `committee_signals` | one row per committee per run | `CongressTrades/outputs/committee_summary.csv` |
| `committee_sectors` | committee × sector | `CongressTrades/committee_signals.py` mapping |
| `politician_committees` | politician × committee | `CongressTrades/committee_signals.py` mapping |
| `schema_version` | migration tracker | `database/schema.sql` |

See `docs/architecture/UML_DIAGRAMS.md` §4 for the entity-relationship diagram.

## Storage Engine & Concurrency Optimization

The data warehouse connection factory applies institutional SQLite pragmas:
```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA cache_size = -64000;  -- 64MB RAM cache
PRAGMA temp_store = MEMORY;
PRAGMA busy_timeout = 5000;  -- 5-second lock queue
```
Under WAL mode, reads never block writes and writes never block reads ($R_{readers} \parallel W_{writer} \implies \emptyset \text{ Contention}$).

## Migrations

Migrations are append-only. To change the schema:

1. Add a file `migrations/NN_description.sql` (zero-padded).
2. Run it against a copy of the DB, verify, commit.
3. Update `schema.sql` to reflect the new state (the canonical schema).

Never edit a shipped migration.
