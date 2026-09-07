-- NUSSIF Infrastructure Projects — SQLite schema
-- Run: python database/init_db.py

PRAGMA foreign_keys = ON;

-- ----------------------------------------------------------------------------
-- Meta: schema version
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schema_version (
    version     INTEGER NOT NULL,
    applied_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
INSERT INTO schema_version (version) VALUES (1);

-- ----------------------------------------------------------------------------
-- Ops: pipeline run history (freshness / monitoring)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pipeline_runs (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    pipeline         TEXT NOT NULL,            -- crypto_bull_cycle | thirteen_f_filings | congress_trading
    status           TEXT NOT NULL,             -- RUNNING | SUCCEEDED | FAILED | CANCELLED
    started_at       TEXT NOT NULL,
    ended_at         TEXT,
    rows_produced    INTEGER,
    error            TEXT,
    triggered_by     TEXT,                     -- manual | cron | dashboard
    CHECK (status IN ('RUNNING','SUCCEEDED','FAILED','CANCELLED'))
);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_pipeline_started
    ON pipeline_runs (pipeline, started_at DESC);

-- ----------------------------------------------------------------------------
-- Crypto: bull/bear cycles
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crypto_cycles (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    type            TEXT NOT NULL,              -- bull | bear
    start_date      TEXT NOT NULL,
    end_date        TEXT NOT NULL,
    start_price     REAL,
    end_price       REAL,
    return          REAL,
    duration_days    INTEGER,
    run_id          INTEGER REFERENCES pipeline_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_crypto_cycles_type_start ON crypto_cycles (type, start_date);

-- ----------------------------------------------------------------------------
-- Crypto: +3-sigma breakout dates and forward-return study
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crypto_breakouts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_date     TEXT NOT NULL,
    horizon_days    INTEGER NOT NULL,
    n_breakouts      INTEGER,
    mean_breakout   REAL,
    median_breakout REAL,
    pct_positive    REAL,
    mean_all        REAL,
    t_stat          REAL,
    p_value         REAL,
    excess_vs_all   REAL,
    run_id          INTEGER REFERENCES pipeline_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_crypto_breakouts_date ON crypto_breakouts (signal_date);

CREATE TABLE IF NOT EXISTS crypto_breakout_dates (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    signal_date     TEXT NOT NULL,
    run_id          INTEGER REFERENCES pipeline_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_crypto_breakout_dates_date ON crypto_breakout_dates (signal_date);

-- ----------------------------------------------------------------------------
-- Crypto: top drawdowns
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crypto_drawdowns (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    peak_date           TEXT NOT NULL,
    trough_date         TEXT NOT NULL,
    recovery_date       TEXT,
    max_drawdown        REAL NOT NULL,
    peak_to_trough_days INTEGER,
    recovery_days       INTEGER,
    run_id              INTEGER REFERENCES pipeline_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_crypto_drawdowns_dd ON crypto_drawdowns (max_drawdown);

-- ----------------------------------------------------------------------------
-- Crypto: strategy vs buy & hold performance metrics
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crypto_performance (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    strategy         TEXT NOT NULL,             -- Breakout Strategy | BTC Buy&Hold | SPY Buy&Hold
    total_return     REAL,
    cagr             REAL,
    volatility_ann   REAL,
    sharpe           REAL,
    sortino          REAL,
    max_drawdown     REAL,
    drawdown_trough  TEXT,
    drawdown_recovery TEXT,
    win_rate         REAL,
    win_rate_invested REAL,
    num_trades       INTEGER,
    final_equity     REAL,
    run_id           INTEGER REFERENCES pipeline_runs(id)
);

-- ----------------------------------------------------------------------------
-- Filings: fund holdings (top-20 per quarter)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fund_holdings (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fund            TEXT NOT NULL,
    quarter         TEXT NOT NULL,             -- e.g. 2026Q2
    portfolio_value TEXT,
    rank            INTEGER,
    ticker          TEXT NOT NULL,
    company         TEXT,
    weight          REAL,
    sector          TEXT,
    run_id          INTEGER REFERENCES pipeline_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_fund_holdings_fund_q ON fund_holdings (fund, quarter);
CREATE INDEX IF NOT EXISTS idx_fund_holdings_ticker ON fund_holdings (ticker);

-- ----------------------------------------------------------------------------
-- Filings: aggregated sector weights per fund per quarter
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sector_weights (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fund            TEXT NOT NULL,
    quarter         TEXT NOT NULL,
    sector          TEXT NOT NULL,
    weight          REAL,
    run_id          INTEGER REFERENCES pipeline_runs(id),
    UNIQUE (fund, quarter, sector)
);
CREATE INDEX IF NOT EXISTS idx_sector_weights_fund_q ON sector_weights (fund, quarter);

-- ----------------------------------------------------------------------------
-- Filings: tracked funds
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS funds (
    code            TEXT PRIMARY KEY,            -- psc | VFC | AM | AC | BRK | HC | tci | DA
    name            TEXT NOT NULL
);

-- ----------------------------------------------------------------------------
-- Congress: trades
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS congress_trades (
    trade_id            TEXT PRIMARY KEY,
    politician_id       TEXT NOT NULL,
    politician          TEXT,
    party               TEXT,
    chamber             TEXT,
    state               TEXT,
    issuer              TEXT,
    ticker              TEXT,
    published           TEXT,
    traded              TEXT,
    filed_after_days    REAL,
    owner               TEXT,
    trade_type          TEXT,                -- buy | sell | exchange
    size_raw            TEXT,
    size_low_usd        REAL,
    size_high_usd       REAL,
    price               REAL,
    sector              TEXT,
    committee_aligned  INTEGER DEFAULT 0,
    matching_committees TEXT,
    run_id              INTEGER REFERENCES pipeline_runs(id)
);
CREATE INDEX IF NOT EXISTS idx_congress_trades_pol ON congress_trades (politician_id, traded);
CREATE INDEX IF NOT EXISTS idx_congress_trades_ticker ON congress_trades (ticker, traded);
CREATE INDEX IF NOT EXISTS idx_congress_trades_party ON congress_trades (party, traded);

-- ----------------------------------------------------------------------------
-- Congress: per-ticker consensus
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticker_consensus (
    ticker            TEXT PRIMARY KEY,
    issuer            TEXT,
    sector            TEXT,
    n_trades          INTEGER,
    n_buy             INTEGER,
    n_sell            INTEGER,
    net_signed_usd    REAL,
    n_politicians     INTEGER,
    buy_pct           REAL,
    consensus         TEXT,                -- BUY | SELL | NEUTRAL
    run_id            INTEGER REFERENCES pipeline_runs(id)
);

-- ----------------------------------------------------------------------------
-- Congress: monthly consensus
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS monthly_consensus (
    month             TEXT PRIMARY KEY,
    n_trades          INTEGER,
    n_buy             INTEGER,
    n_sell            INTEGER,
    net_signed_usd    REAL,
    buy_share         REAL,
    run_id            INTEGER REFERENCES pipeline_runs(id)
);

-- ----------------------------------------------------------------------------
-- Congress: committee alignment summary
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS committee_signals (
    committee         TEXT,
    n_trades          INTEGER,
    n_buy             INTEGER,
    n_sell            INTEGER,
    n_politicians     INTEGER,
    total_size_low_usd REAL,
    run_id            INTEGER REFERENCES pipeline_runs(id),
    PRIMARY KEY (committee, run_id)
);

-- ----------------------------------------------------------------------------
-- Reference: committee -> sector mapping (for the alignment signal)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS committee_sectors (
    committee         TEXT NOT NULL,
    sector            TEXT NOT NULL,
    PRIMARY KEY (committee, sector)
);

-- ----------------------------------------------------------------------------
-- Reference: politician -> committee mapping
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS politician_committees (
    politician_id     TEXT NOT NULL,
    committee         TEXT NOT NULL,
    PRIMARY KEY (politician_id, committee)
);
