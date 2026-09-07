"""Market-data endpoints backed by Massive."""

from __future__ import annotations

from fastapi import APIRouter, Query

from shared.massive import ping, prev_close

router = APIRouter(prefix="/market", tags=["market"])

DEFAULT_QUOTES = ["X:BTCUSD", "SPY", "QQQ", "IWM"]


@router.get("/status")
def market_status():
    return ping()


@router.get("/quotes")
def market_quotes(tickers: str | None = Query(None, description="comma-separated Massive tickers")):
    symbols = [t.strip() for t in (tickers or ",".join(DEFAULT_QUOTES)).split(",") if t.strip()]
    out = []
    for sym in symbols[:12]:
        q = prev_close(sym)
        if q:
            out.append(q)
        else:
            out.append({"ticker": sym, "close": None})
    return out
