"""Data loader for BTC-USD and SPY.

Primary: Massive aggregates (X:BTCUSD, SPY) when MASSIVE_API is set.
Fallback: yfinance. Results are cached to CSV.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from shared.massive import configured as massive_configured, daily_bars

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)

MASSIVE_TICKER = {
    "BTC-USD": "X:BTCUSD",
    "SPY": "SPY",
}


def _cache_path(symbol: str) -> Path:
    return CACHE_DIR / f"{symbol}.csv"


def _from_massive(symbol: str, start: str) -> pd.DataFrame | None:
    ticker = MASSIVE_TICKER.get(symbol, symbol)
    rows = daily_bars(ticker, start=start)
    if not rows:
        return None
    df = pd.DataFrame(rows)
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()
    return df.dropna()


def _from_yfinance(symbol: str, start: str) -> pd.DataFrame:
    import yfinance as yf
    df = yf.download(symbol, start=start, auto_adjust=True, progress=False)
    if df.empty:
        raise RuntimeError(f"No data returned for {symbol}")
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    return df.dropna()


def load_price(symbol: str = "BTC-USD", start: str = "2014-09-17", use_cache: bool = True) -> pd.DataFrame:
    cache = _cache_path(symbol)
    if use_cache and cache.exists():
        age_days = (pd.Timestamp.utcnow() - pd.Timestamp(cache.stat().st_mtime, tz="UTC")).days
        if age_days < 1:
            return pd.read_csv(cache, index_col=0, parse_dates=True)

    df = None
    source = "yfinance"
    if massive_configured():
        df = _from_massive(symbol, start)
        if df is not None and not df.empty:
            source = "massive"
    if df is None or df.empty:
        df = _from_yfinance(symbol, start)
        source = "yfinance"
    df.attrs["source"] = source
    df.to_csv(cache)
    print(f"  {symbol}: {len(df)} bars via {source}")
    return df


def load_btc(start: str = "2014-09-17") -> pd.DataFrame:
    return load_price("BTC-USD", start=start)


def load_spy(start: str = "2014-09-17") -> pd.DataFrame:
    return load_price("SPY", start=start)


if __name__ == "__main__":
    btc = load_btc()
    spy = load_spy()
    print(f"BTC rows: {len(btc)}  range: {btc.index.min().date()} -> {btc.index.max().date()}")
    print(f"SPY rows: {len(spy)}  range: {spy.index.min().date()} -> {spy.index.max().date()}")
    print(btc.tail())
