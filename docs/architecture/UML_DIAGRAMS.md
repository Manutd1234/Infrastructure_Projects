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
        CBC[CryptoCycle]
        TFF[HedgeFund13F]
        CTR[CongressTrades]
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

    U->>F: clicks "Run CryptoCycle"
    F->>B: POST /ops/run/CryptoCycle
    B->>DB: INSERT pipeline_runs (status='RUNNING')
    B->>P: subprocess.run python main.py
    P-->>B: exit code 0
    B->>DB: UPDATE pipeline_runs (status='SUCCEEDED', rows=N)
    B-->>F: 202 { run_id }
    F->>B: GET /ops/run/CryptoCycle/status (poll)
    B-->>F: { status: 'SUCCEEDED' }
    F->>B: GET /crypto/cycles (fresh data)
    B->>DB: SELECT id, type, start_date, end_date... FROM crypto_cycles
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

## 7. Frontend Subtab Architecture & Component Tree

```mermaid
flowchart TD
    App[App.tsx / Router] --> Layout[Dashboard Layout / Sidebar / Header]
    Layout --> Views[6 Main Desk Views]
    
    subgraph Views
        V1[Overview.tsx]
        V2[Crypto.tsx]
        V3[Filings.tsx]
        V4[Congress.tsx]
        V5[StressTest.tsx]
        V6[Database.tsx]
    end
    
    subgraph Subtabs["Unified Design System (Tabs.tsx)"]
        Nav[".subtab-nav-bar (37.6px fixed height)"]
        Btn[".subtab-btn (13px font-bold, uniform padding)"]
        Active[".subtab-btn-active (elevated drop shadow, border #d0c4b2)"]
        Badge[".subtab-badge (pill counts & metadata)"]
    end
    
    V1 --> Subtabs
    V2 --> Subtabs
    V3 --> Subtabs
    V4 --> Subtabs
    V5 --> Subtabs
    V6 --> Subtabs
```

## 8. Real-Time Telemetry & AST Guardrail Sequence

```mermaid
sequenceDiagram
    participant Desk as Trading Desk Client
    participant WS as WebSocket /ws/telemetry
    participant API as FastAPI Router
    participant AST as AST Syntax Parser
    participant WAL as SQLite WAL Engine

    par Live Tape Broadcast
        loop Every 15 Seconds
            API->>WS: Broadcast L1 Prices (BTC, SPY, QQQ, IWM)
            WS-->>Desk: Render Cross-Asset Marquee
        end
    and Sandboxed Analytical Query
        Desk->>API: POST /api/database/query { sql }
        API->>AST: parse_query_tokens(sql)
        alt Token is Mutation (DROP, INSERT, UPDATE)
            AST-->>API: Reject Security Violation
            API-->>Desk: 403 Forbidden ("Read-Only AST Enforcement")
        else Token is Valid SELECT
            AST-->>API: Query Approved
            API->>WAL: Execute Query (Snapshot Isolation)
            WAL-->>API: Row Tuples (<2.4ms)
            API-->>Desk: JSON Result Rows + Latency Benchmark
        end
    end
```

