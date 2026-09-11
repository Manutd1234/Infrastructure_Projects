"""Congress trading disclosure endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.app.schemas import (
    CommitteeSignalResponse,
    ConsensusResponse,
    MonthlyConsensusResponse,
    TradeResponse,
)
from backend.app.services import congress_service

router = APIRouter(prefix="/congress", tags=["congress"])


@router.get(
    "/trades",
    response_model=list[TradeResponse],
    summary="Get Congressional Trades",
    description="Retrieve STOCK Act trade disclosures with multidimensional filtering and committee jurisdiction alignment.",
)
def get_trades(
    politician_id: str | None = Query(None, description="Politician unique ID (e.g. 'P000197')"),
    ticker: str | None = Query(None, description="Asset ticker symbol (e.g. 'NVDA')"),
    party: str | None = Query(None, description="Political party (e.g. 'Democrat', 'Republican')"),
    trade_type: str | None = Query(None, description="Transaction type ('purchase', 'sale')"),
    aligned: bool | None = Query(None, description="Filter for committee-aligned trades"),
    start_date: str | None = Query(None, description="Start traded date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End traded date (YYYY-MM-DD)"),
    limit: int = Query(100, le=1000, ge=1, description="Maximum number of trade records to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
) -> list[dict]:
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


@router.get(
    "/consensus",
    response_model=list[ConsensusResponse],
    summary="Get Ticker Consensus",
    description="Retrieve per-ticker consensus aggregations ranked by net signed USD with BUY/SELL flags.",
)
def get_consensus() -> list[dict]:
    return congress_service.consensus()


@router.get(
    "/consensus/monthly",
    response_model=list[MonthlyConsensusResponse],
    summary="Get Monthly Consensus",
    description="Retrieve aggregate monthly congressional buying and selling trends.",
)
def get_monthly_consensus() -> list[dict]:
    return congress_service.monthly_consensus()


@router.get(
    "/committees",
    response_model=list[CommitteeSignalResponse],
    summary="Get Committee Signals",
    description="Retrieve trade activity grouped by congressional committee.",
)
def get_committees() -> list[dict]:
    return congress_service.committee_signals()
