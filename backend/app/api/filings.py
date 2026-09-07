"""13F filings endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.app.services import filings_service

router = APIRouter(prefix="/filings", tags=["filings"])


@router.get("/funds")
def get_funds():
    return filings_service.funds()


@router.get("/holdings")
def get_holdings(
    fund: str | None = Query(None),
    quarter: str | None = Query(None),
):
    return filings_service.holdings(fund=fund, quarter=quarter)


@router.get("/sector-weights")
def get_sector_weights(fund: str | None = Query(None)):
    return filings_service.sector_weights(fund=fund)
