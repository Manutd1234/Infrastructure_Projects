"""Market-data endpoints backed by Massive (with yfinance fallback)."""

from __future__ import annotations

from fastapi import APIRouter, Query

from backend.app.schemas import MarketQuoteResponse, MarketStatusResponse
from shared.massive import ping, prev_close

router = APIRouter(prefix="/market", tags=["market"])

DEFAULT_QUOTES = ["X:BTCUSD", "SPY", "QQQ", "IWM"]


@router.get(
    "/status",
    response_model=MarketStatusResponse,
    summary="Market Data Provider Status",
    description="Check connectivity to the Massive market data provider and verify aggregate quote access.",
)
def market_status() -> dict:
    return ping()


@router.get(
    "/quotes",
    response_model=list[MarketQuoteResponse],
    summary="Get L1 Previous-Close Quotes",
    description="Retrieve previous day close, open, high, low, and volume bars for specified tickers.",
)
def market_quotes(
    tickers: str | None = Query(None, description="Comma-separated ticker list (default: X:BTCUSD, SPY, QQQ, IWM)"),
) -> list[dict]:
    symbols = [t.strip() for t in (tickers or ",".join(DEFAULT_QUOTES)).split(",") if t.strip()]
    out = []
    for sym in symbols[:12]:
        q = prev_close(sym)
        if q:
            out.append(q)
        else:
            out.append({"ticker": sym, "close": None})
    return out
