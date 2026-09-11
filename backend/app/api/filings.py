"""13F institutional filings endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.app.schemas import FundResponse, HoldingResponse, SectorWeightResponse
from backend.app.services import filings_service

router = APIRouter(prefix="/filings", tags=["filings"])


@router.get(
    "/funds",
    response_model=list[FundResponse],
    summary="List Tracked Funds",
    description="Retrieve institutional superinvestor fund codes and management firm names.",
)
def get_funds() -> list[dict]:
    return filings_service.funds()


@router.get(
    "/holdings",
    response_model=list[HoldingResponse],
    summary="Get Fund Holdings",
    description="Retrieve institutional portfolio holdings filtered by fund code and reporting quarter.",
)
def get_holdings(
    fund: str | None = Query(None, description="Fund ticker code (e.g. 'BRK', 'psc', 'AM')"),
    quarter: str | None = Query(None, description="Quarter identifier (e.g. '2026Q1')"),
) -> list[dict]:
    return filings_service.holdings(fund=fund, quarter=quarter)


@router.get(
    "/sector-weights",
    response_model=list[SectorWeightResponse],
    summary="Get Sector Weights",
    description="Retrieve quarterly GICS sector allocations for tracked funds over time.",
)
def get_sector_weights(
    fund: str | None = Query(None, description="Fund ticker code filter"),
) -> list[dict]:
    return filings_service.sector_weights(fund=fund)
