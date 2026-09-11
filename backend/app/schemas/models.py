"""Pydantic request and response schemas for all FastAPI endpoints."""

from __future__ import annotations

from typing import Any
from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


# ============================================================================
# Crypto Schemas
# ============================================================================

class CycleResponse(BaseSchema):
    id: int | None = None
    type: str
    start_date: str
    end_date: str
    start_price: float | None = None
    end_price: float | None = None
    return_val: float | None = Field(None, alias="return")
    duration_days: int | None = None
    run_id: int | None = None


class BreakoutResponse(BaseSchema):
    id: int | None = None
    horizon: int
    n_breakouts: int | None = None
    mean_breakout: float | None = None
    median_breakout: float | None = None
    pct_positive: float | None = None
    mean_all: float | None = None
    t_stat: float | None = None
    p_value: float | None = None
    excess_vs_all: float | None = None
    run_id: int | None = None


class BreakoutDateResponse(BaseSchema):
    signal_date: str
    run_id: int | None = None


class DrawdownResponse(BaseSchema):
    id: int | None = None
    peak_date: str | None = None
    trough_date: str | None = None
    recovery_date: str | None = None
    max_drawdown: float | None = None
    peak_to_trough_days: int | None = None
    recovery_days: int | None = None
    run_id: int | None = None


class PerformanceResponse(BaseSchema):
    strategy: str
    total_return: float | None = None
    cagr: float | None = None
    volatility_ann: float | None = None
    sharpe: float | None = None
    sortino: float | None = None
    max_drawdown: float | None = None
    drawdown_trough: str | None = None
    drawdown_recovery: str | None = None
    win_rate: float | None = None
    win_rate_invested: float | None = None
    num_trades: int | float | None = None
    final_equity: float | None = None
    run_id: int | None = None


class EquityCurvePoint(BaseSchema):
    date: str
    strategy: float
    btc_buy_hold: float | None = None
    spy_buy_hold: float | None = None


# ============================================================================
# Filings Schemas
# ============================================================================

class FundResponse(BaseSchema):
    code: str
    name: str


class HoldingResponse(BaseSchema):
    fund: str
    quarter: str
    quarter_label: str | None = None
    portfolio_value: str | float | None = None
    rank: int | None = None
    ticker: str
    company: str
    weight: float | None = None
    sector: str | None = None
    run_id: int | None = None


class SectorWeightResponse(BaseSchema):
    fund: str
    quarter: str
    sector: str
    weight: float
    run_id: int | None = None


# ============================================================================
# Congress Schemas
# ============================================================================

class TradeResponse(BaseSchema):
    trade_id: str
    politician_id: str | None = None
    politician: str | None = None
    party: str | None = None
    chamber: str | None = None
    state: str | None = None
    issuer: str | None = None
    ticker: str | None = None
    published: str | None = None
    traded: str | None = None
    filed_after_days: float | int | None = None
    owner: str | None = None
    trade_type: str | None = None
    size_raw: str | None = None
    size_low_usd: float | None = None
    size_high_usd: float | None = None
    price: float | None = None
    sector: str | None = None
    committee_aligned: int | bool | str | None = None
    matching_committees: str | None = None
    run_id: int | None = None


class ConsensusResponse(BaseSchema):
    ticker: str
    issuer: str
    sector: str | None = None
    n_trades: int
    n_buy: int
    n_sell: int
    net_signed_usd: float
    n_politicians: int
    buy_pct: float | None = None
    consensus: str
    run_id: int | None = None


class MonthlyConsensusResponse(BaseSchema):
    month: str
    n_trades: int
    n_buy: int
    n_sell: int
    net_signed_usd: float
    buy_share: float | None = None
    run_id: int | None = None


class CommitteeSignalResponse(BaseSchema):
    committee: str
    n_trades: int
    n_buy: int
    n_sell: int
    n_politicians: int
    total_size_low_usd: float | None = None
    run_id: int | None = None


# ============================================================================
# Ops Schemas
# ============================================================================

class PipelineRunResponse(BaseSchema):
    id: int
    pipeline: str
    status: str
    started_at: str
    ended_at: str | None = None
    rows_produced: int | None = None
    error: str | None = None
    triggered_by: str | None = None


class TriggerRunResponse(BaseSchema):
    run_id: int
    status: str


# ============================================================================
# Database Schemas
# ============================================================================

class TableInfoResponse(BaseSchema):
    name: str
    rows: int


class QueryRequest(BaseSchema):
    sql: str
    limit: int = Field(1000, le=1000, ge=1)


class QueryResponse(BaseSchema):
    rows: list[dict[str, Any]]
    count: int
    duration_ms: float | None = None


# ============================================================================
# Market Schemas
# ============================================================================

class MarketStatusResponse(BaseSchema):
    configured: bool
    ok: bool
    provider: str
    base_url: str | None = None
    spy_prev_close: float | None = None
    detail: str


class MarketQuoteResponse(BaseSchema):
    ticker: str
    close: float | None = None
    open: float | None = None
    high: float | None = None
    low: float | None = None
    volume: float | None = None
    vwap: float | None = None


# ============================================================================
# Health & Metrics Schemas
# ============================================================================

class HealthResponse(BaseSchema):
    status: str


class HealthReadyResponse(BaseSchema):
    status: str
    tables: int
    massive: dict[str, Any]


class MetricsResponse(BaseSchema):
    total_requests: int
    avg_duration_ms: float
    p50_duration_ms: float
    p95_duration_ms: float
    endpoints: dict[str, int]
