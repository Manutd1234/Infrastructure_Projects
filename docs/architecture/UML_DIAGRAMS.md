# UML Diagrams

All diagrams use [Mermaid](https://mermaid.js.org/) so they render on GitHub
and can be embedded in the Typst whitepaper.

## 1. Component diagram

```mermaid
flowchart LR
    subgraph External["External sources"]
        YF[yfinance]
        DR[Dataroma]
        CT[Capitol Trades]
    end

    subgraph Data["analysis modules"]
        CBC[CryptoBullCycle]
        TFF[ThirteenFFilings]
        CTR[CongressTrading]
    end

    subgraph Backend["backend (FastAPI)"]
        API[API routers]
        SVC[services]
        REP[repositories]
        LDR[loaders]
        OPS[ops runner]
    end

    subgraph DB["database"]
        SQLite[(SQLite)]
    end

    subgraph FE["frontend (React)"]
        DASH[Trading Desk Dashboard]
    end

    YF --> CBC
    DR --> TFF
    CT --> CTR
    CBC -->|CSV| LDR
    TFF -->|CSV| LDR
    CTR -->|CSV| LDR
    LDR --> SQLite
    OPS -->|subprocess| CBC
    OPS -->|subprocess| TFF
    OPS -->|subprocess| CTR
    OPS --> SQLite
    API --> SVC --> REP --> SQLite
    DASH -->|JSON| API
```

## 2. Deployment diagram (single machine)

```mermaid
flowchart TB
    Browser[Operator browser] -->|HTTPS| Nginx[Nginx]
    Nginx -->|/api| UV[uvicorn :8000]
    Nginx -->|/| Vite[Vite dev/build :5173]
    UV --> SQLite[(SQLite file)]
    UV -->|subprocess| Pipelines[repo-root modules]
    Pipelines -->|write CSV| Out[outputs/]
    Out -->|ingest| SQLite
```

## 3. Sequence: operator triggers a pipeline run from the dashboard

```mermaid
sequenceDiagram
    participant U as Operator
    participant F as Frontend
    participant B as Backend
    participant DB as SQLite
    participant P as Pipeline (subprocess)

    U->>F: clicks "Run crypto_bull_cycle"
    F->>B: POST /ops/run/crypto_bull_cycle
    B->>DB: INSERT pipeline_runs (status='RUNNING')
    B->>P: subprocess.run python main.py
    P-->>B: exit code 0
    B->>DB: UPDATE pipeline_runs (status='SUCCEEDED', rows=N)
    B-->>F: 202 { run_id }
    F->>B: GET /ops/run/crypto_bull_cycle/status (poll)
    B-->>F: { status: 'SUCCEEDED' }
    F->>B: GET /crypto/cycles (fresh data)
    B->>DB: SELECT * FROM crypto_cycles
    DB-->>B: rows
    B-->>F: JSON
    F-->>U: chart re-renders
```

## 4. Entity-relationship (database schema)

```mermaid
erDiagram
    pipeline_runs ||--o{ crypto_cycles : produces
    pipeline_runs ||--o{ crypto_breakouts : produces
    pipeline_runs ||--o{ crypto_drawdowns : produces
    pipeline_runs ||--o{ fund_holdings : produces
    pipeline_runs ||--o{ congress_trades : produces
    fund_holdings }o--|| sector_weights : aggregates_to
    congress_trades }o--|| ticker_consensus : aggregates_to
    congress_trades }o--|| committee_signals : matches

    pipeline_runs {
        INTEGER id PK
        TEXT pipeline
        TEXT status
        TIMESTAMP started_at
        TIMESTAMP ended_at
        INTEGER rows_produced
        TEXT error
    }
    crypto_cycles {
        INTEGER id PK
        TEXT type
        DATE start_date
        DATE end_date
        REAL return
        INTEGER duration_days
    }
    crypto_breakouts {
        INTEGER id PK
        DATE signal_date
        INTEGER horizon_days
        REAL mean_breakout
        REAL t_stat
        REAL p_value
    }
    fund_holdings {
        INTEGER id PK
        TEXT fund
        TEXT quarter
        TEXT ticker
        REAL weight
        TEXT sector
    }
    congress_trades {
        TEXT trade_id PK
        TEXT politician_id
        TEXT ticker
        DATE traded
        TEXT trade_type
        REAL size_low_usd
        REAL size_high_usd
        TEXT sector
        BOOLEAN committee_aligned
    }
    ticker_consensus {
        TEXT ticker PK
        INTEGER n_buy
        INTEGER n_sell
        REAL net_signed_usd
        TEXT consensus
    }
```

## 5. State machine: pipeline run lifecycle

```mermaid
stateDiagram-v2
    [*] --> QUEUED
    QUEUED --> RUNNING: subprocess started
    RUNNING --> SUCCEEDED: exit 0
    RUNNING --> FAILED: exit != 0 or timeout
    SUCCEEDED --> [*]
    FAILED --> [*]
    RUNNING --> CANCELLED: operator cancel
    CANCELLED --> [*]
```

## 6. Class diagram: backend layering

```mermaid
classDiagram
    class Router {
        +get() / post()
    }
    class Service {
        +list_cycles()
        +run_pipeline(name)
    }
    class Repository {
        +query(sql, params)
        +insert_row(table, row)
    }
    class Loader {
        +ingest_csv(path, table)
    }
    class Settings {
        +database_url
        +pipelines_dir
        +enable_run_endpoint
    }
    Router --> Service
    Service --> Repository
    Service --> Loader
    Repository --> Settings
    Loader --> Settings
```
