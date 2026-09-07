"""Congress trading endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.app.services import congress_service

router = APIRouter(prefix="/congress", tags=["congress"])


@router.get("/trades")
def get_trades(
    politician_id: str | None = Query(None),
    ticker: str | None = Query(None),
    party: str | None = Query(None),
    trade_type: str | None = Query(None),
    aligned: bool | None = Query(None),
    start_date: str | None = Query(None),
    end_date: str | None = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0, ge=0),
):
    return congress_service.trades(
        politician_id=politician_id,
        ticker=ticker,
        party=party,
        trade_type=trade_type,
        aligned=aligned,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


@router.get("/consensus")
def get_consensus():
    return congress_service.consensus()


@router.get("/consensus/monthly")
def get_monthly_consensus():
    return congress_service.monthly_consensus()


@router.get("/committees")
def get_committees():
    return congress_service.committee_signals()
