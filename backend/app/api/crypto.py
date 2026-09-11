"""Crypto quantitative analysis endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from backend.app.schemas import (
    BreakoutDateResponse,
    BreakoutResponse,
    CycleResponse,
    DrawdownResponse,
    EquityCurvePoint,
    PerformanceResponse,
)
from backend.app.services import crypto_service

router = APIRouter(prefix="/crypto", tags=["crypto"])


@router.get(
    "/cycles",
    response_model=list[CycleResponse],
    summary="Get Bitcoin Cycle Episodes",
    description="Retrieve all historical Bitcoin bull and bear market episodes with return and duration metrics.",
)
def get_cycles() -> list[dict]:
    return crypto_service.cycles()


@router.get(
    "/bear-markets",
    response_model=list[CycleResponse],
    summary="Get Bear Markets",
    description="Retrieve Bitcoin bear market cycles (peak-to-trough drawdowns >= 20%).",
)
def get_bear_markets() -> list[dict]:
    return crypto_service.bear_markets()


@router.get(
    "/breakouts",
    response_model=list[BreakoutResponse],
    summary="Get Breakout Drift Study",
    description="Retrieve forward-return drift statistics across 30, 60, 120, and 365-day horizons after +3σ weekly breakouts.",
)
def get_breakouts() -> list[dict]:
    return crypto_service.breakouts()


@router.get(
    "/breakout-dates",
    response_model=list[BreakoutDateResponse],
    summary="Get Breakout Signal Dates",
    description="Retrieve all dates on which a +3σ weekly breakout signal triggered.",
)
def get_breakout_dates() -> list[dict]:
    return crypto_service.breakout_dates()


@router.get(
    "/drawdowns",
    response_model=list[DrawdownResponse],
    summary="Get Deepest Drawdowns",
    description="Retrieve top 15 deepest historical Bitcoin drawdowns with peak, trough, and recovery durations.",
)
def get_drawdowns() -> list[dict]:
    return crypto_service.drawdowns()


@router.get(
    "/performance",
    response_model=list[PerformanceResponse],
    summary="Get Strategy Performance",
    description="Retrieve backtest performance comparisons between the breakout strategy, BTC buy & hold, and SPY buy & hold.",
)
def get_performance() -> list[dict]:
    return crypto_service.performance()


@router.get(
    "/equity-curve",
    response_model=list[EquityCurvePoint],
    summary="Get Equity Curves",
    description="Retrieve normalized equity curve trajectories for the breakout strategy vs BTC and SPY benchmarks.",
)
def get_equity_curve() -> list[dict]:
    return crypto_service.equity_curve()
