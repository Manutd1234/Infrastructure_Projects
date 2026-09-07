"""Massive (formerly Polygon) market-data client.

Reads the key from MASSIVE_API or MASSIVE_API_KEY. Never logs the key.
Falls back to None / empty so pipelines can use yfinance when Massive
is unavailable.
"""

from __future__ import annotations

import os
from datetime import date, datetime, timezone
from pathlib import Path

import requests

_ENV_FILES = [
    Path(__file__).resolve().parents[1] / ".env",
    Path.cwd() / ".env",
]


def _load_dotenv() -> None:
    for path in _ENV_FILES:
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, val = line.partition("=")
            key, val = key.strip(), val.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = val


_load_dotenv()

BASE_URL = os.environ.get("MASSIVE_BASE_URL", "https://api.massive.com").rstrip("/")

SIC_TO_GICS = {
    "01": "Consumer Staples", "02": "Consumer Staples", "07": "Consumer Staples",
    "08": "Materials", "09": "Consumer Discretionary",
    "10": "Materials", "12": "Energy", "13": "Energy", "14": "Materials",
    "15": "Industrials", "16": "Industrials", "17": "Industrials",
    "20": "Consumer Staples", "21": "Consumer Staples",
    "22": "Consumer Discretionary", "23": "Consumer Discretionary",
    "24": "Materials", "25": "Consumer Discretionary", "26": "Materials",
    "27": "Communication Services",
    "28": "Healthcare",
    "29": "Energy",
    "30": "Materials", "31": "Consumer Discretionary", "32": "Materials",
    "33": "Materials", "34": "Industrials",
    "35": "Industrials", "36": "Technology",
    "37": "Consumer Discretionary", "38": "Healthcare", "39": "Industrials",
    "40": "Industrials", "41": "Industrials", "42": "Industrials",
    "44": "Industrials", "45": "Industrials", "46": "Energy", "47": "Industrials",
    "48": "Communication Services", "49": "Utilities",
    "50": "Industrials", "51": "Consumer Staples",
    "52": "Consumer Discretionary", "53": "Consumer Discretionary",
    "54": "Consumer Staples", "55": "Consumer Discretionary",
    "56": "Consumer Discretionary", "57": "Consumer Discretionary",
    "58": "Consumer Discretionary", "59": "Consumer Discretionary",
    "60": "Financials", "61": "Financials", "62": "Financials",
    "63": "Financials", "64": "Financials", "65": "Real Estate",
    "67": "Financials",
    "70": "Consumer Discretionary", "72": "Consumer Discretionary",
    "73": "Technology", "75": "Consumer Discretionary",
    "76": "Industrials", "78": "Communication Services",
    "79": "Consumer Discretionary", "80": "Healthcare",
    "82": "Consumer Discretionary", "83": "Healthcare",
    "87": "Industrials", "89": "Industrials",
}


def api_key() -> str | None:
    return os.environ.get("MASSIVE_API_KEY") or os.environ.get("MASSIVE_API") or None


def configured() -> bool:
    return bool(api_key())


def _get(path: str, params: dict | None = None, timeout: int = 20) -> dict | None:
    key = api_key()
    if not key:
        return None
    q = dict(params or {})
    q["apiKey"] = key
    url = path if path.startswith("http") else f"{BASE_URL}{path}"
    try:
        r = requests.get(url, params=q, timeout=timeout)
        if r.status_code != 200:
            return None
        return r.json()
    except Exception:
        return None


def ping() -> dict:
    """Lightweight status check. Does not return the key."""
    if not configured():
        return {"configured": False, "ok": False, "provider": "massive", "detail": "MASSIVE_API not set"}
    data = _get("/v2/aggs/ticker/SPY/prev", timeout=8)
    ok = bool(data and data.get("status") in ("OK", "DELAYED") and data.get("results"))
    close = None
    if ok:
        close = data["results"][0].get("c")
    return {
        "configured": True,
        "ok": ok,
        "provider": "massive",
        "base_url": BASE_URL,
        "spy_prev_close": close,
        "detail": "connected" if ok else "request failed (check plan / key)",
    }


def daily_bars(ticker: str, start: str = "2014-09-17", end: str | None = None) -> list[dict]:
    """Return [{date, Open, High, Low, Close, Volume}, ...] from Massive aggregates."""
    end = end or date.today().isoformat()
    rows: list[dict] = []
    path = f"/v2/aggs/ticker/{ticker}/range/1/day/{start}/{end}"
    params = {"adjusted": "true", "sort": "asc", "limit": 50000}
    while path:
        payload = _get(path, params)
        params = None  # next_url already includes query string
        if not payload or not payload.get("results"):
            break
        for bar in payload["results"]:
            ts = datetime.fromtimestamp(bar["t"] / 1000, tz=timezone.utc)
            rows.append({
                "date": ts.date().isoformat(),
                "Open": bar.get("o"),
                "High": bar.get("h"),
                "Low": bar.get("l"),
                "Close": bar.get("c"),
                "Volume": bar.get("v"),
            })
        nxt = payload.get("next_url")
        path = nxt if nxt else ""
    return rows


def prev_close(ticker: str) -> dict | None:
    payload = _get(f"/v2/aggs/ticker/{ticker}/prev")
    if not payload or not payload.get("results"):
        return None
    bar = payload["results"][0]
    return {
        "ticker": ticker,
        "close": bar.get("c"),
        "open": bar.get("o"),
        "high": bar.get("h"),
        "low": bar.get("l"),
        "volume": bar.get("v"),
        "vwap": bar.get("vw"),
    }


def ticker_overview(ticker: str) -> dict | None:
    payload = _get(f"/v3/reference/tickers/{ticker}")
    if not payload or not payload.get("results"):
        return None
    return payload["results"]


def sector_from_overview(info: dict | None) -> str | None:
    if not info:
        return None
    sic = str(info.get("sic_code") or "")
    if len(sic) >= 2:
        mapped = SIC_TO_GICS.get(sic[:2])
        if mapped:
            # Chemical drugs (283x) stay Healthcare; industrial chemicals -> Materials
            if sic[:2] == "28" and not sic.startswith("283"):
                return "Materials"
            return mapped
    desc = (info.get("sic_description") or "").lower()
    if "software" in desc or "computer" in desc or "semicon" in desc:
        return "Technology"
    if "bank" in desc or "insurance" in desc or "invest" in desc:
        return "Financials"
    if "pharma" in desc or "bio" in desc or "medic" in desc:
        return "Healthcare"
    if "oil" in desc or "gas" in desc or "petroleum" in desc:
        return "Energy"
    if "real estate" in desc or "reit" in desc:
        return "Real Estate"
    return None


def massive_sector(ticker: str) -> str | None:
    return sector_from_overview(ticker_overview(ticker))
