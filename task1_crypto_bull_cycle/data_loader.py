"""Data loader for BTC-USD and SPY.

Uses yfinance to pull daily OHLCV history. Results are cached to a local
parquet file so repeated runs don't re-hit the network.
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import yfinance as yf

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)


def _cache_path(symbol: str) -> Path:
    return CACHE_DIR / f"{symbol}.csv"


def load_price(symbol: str = "BTC-USD", start: str = "2014-09-17", use_cache: bool = True) -> pd.DataFrame:
    """Load daily OHLCV for a symbol. Returns a DataFrame indexed by date."""
    cache = _cache_path(symbol)
    if use_cache and cache.exists():
        df = pd.read_csv(cache, index_col=0, parse_dates=True)
        # Refresh if older than 1 day
        if (pd.Timestamp.utcnow() - pd.Timestamp(cache.stat().st_mtime, tz="UTC")).days < 1:
            return df
    df = yf.download(symbol, start=start, auto_adjust=True, progress=False)
    if df.empty:
        raise RuntimeError(f"No data returned for {symbol}")
    # yfinance may return MultiIndex columns when a single ticker is passed
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = df.columns.get_level_values(0)
    df = df.dropna()
    df.to_csv(cache)
    return df


def load_btc(start: str = "2014-09-17") -> pd.DataFrame:
    """Bitcoin daily series. yfinance BTC-USD goes back to 2014-09-17."""
    return load_price("BTC-USD", start=start)


def load_spy(start: str = "2014-09-17") -> pd.DataFrame:
    """SPY ETF daily series as the equity benchmark."""
    return load_price("SPY", start=start)


if __name__ == "__main__":
    btc = load_btc()
    spy = load_spy()
    print(f"BTC rows: {len(btc)}  range: {btc.index.min().date()} -> {btc.index.max().date()}")
    print(f"SPY rows: {len(spy)}  range: {spy.index.min().date()} -> {spy.index.max().date()}")
    print(btc.tail())
