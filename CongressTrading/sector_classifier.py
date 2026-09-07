"""Sector classifier for congress-trade tickers.

Capitol Trades tickers look like "AAPL:US" (Bloomberg-style with the
listing country code). We strip the ":US" suffix and classify via a
curated fallback + yfinance. Results are cached to `cache/sectors.csv`.
"""

from __future__ import annotations

import time
from pathlib import Path

import pandas as pd
import yfinance as yf

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
CACHE_FILE = CACHE_DIR / "sectors.csv"

YF_TO_GICS = {
    "Consumer Cyclical": "Consumer Discretionary",
    "Consumer Defensive": "Consumer Staples",
    "Financial Services": "Financials",
    "Basic Materials": "Materials",
}


def _normalise(sector: str | None) -> str:
    if not sector:
        return "Unknown"
    return YF_TO_GICS.get(sector, sector)


# Curated fallback for tickers most commonly seen in congress trades.
FALLBACK = {
    "AAPL": "Technology", "MSFT": "Technology", "NVDA": "Technology", "AVGO": "Technology",
    "GOOGL": "Communication Services", "GOOG": "Communication Services", "META": "Communication Services",
    "AMZN": "Consumer Discretionary", "TSLA": "Consumer Discretionary", "HD": "Consumer Discretionary",
    "COST": "Consumer Staples", "WMT": "Consumer Staples", "KO": "Consumer Staples", "PEP": "Consumer Staples",
    "PG": "Consumer Staples", "MO": "Consumer Staples", "PM": "Consumer Staples",
    "JPM": "Financials", "BAC": "Financials", "WFC": "Financials", "GS": "Financials",
    "MS": "Financials", "AXP": "Financials", "V": "Financials", "MA": "Financials",
    "BRK.B": "Financials", "BLK": "Financials", "SCHW": "Financials", "CB": "Financials",
    "JNJ": "Healthcare", "LLY": "Healthcare", "PFE": "Healthcare", "MRK": "Healthcare",
    "ABBV": "Healthcare", "UNH": "Healthcare", "MRNA": "Healthcare", "GILD": "Healthcare",
    "XOM": "Energy", "CVX": "Energy", "COP": "Energy", "OXY": "Energy", "SLB": "Energy",
    "MPC": "Energy", "PSX": "Energy", "VLO": "Energy", "EOG": "Energy",
    "BA": "Industrials", "CAT": "Industrials", "GE": "Industrials", "LMT": "Industrials",
    "NOC": "Industrials", "RTX": "Industrials", "GD": "Industrials", "UPS": "Industrials",
    "FDX": "Industrials", "UNP": "Industrials", "DAL": "Industrials", "UAL": "Industrials",
    "LULU": "Consumer Discretionary", "NKE": "Consumer Discretionary", "SBUX": "Consumer Discretionary",
    "MCD": "Consumer Discretionary", "BKNG": "Consumer Discretionary", "ABNB": "Consumer Discretionary",
    "DIS": "Communication Services", "NFLX": "Communication Services", "CMCSA": "Communication Services",
    "T": "Communication Services", "VZ": "Communication Services",
    "LIN": "Materials", "SHW": "Materials", "FCX": "Materials", "NUE": "Materials", "NEM": "Materials",
    "AMT": "Real Estate", "PLD": "Real Estate", "SPG": "Real Estate", "O": "Real Estate",
    "NEE": "Utilities", "DUK": "Utilities", "SO": "Utilities",
    "ORCL": "Technology", "CRM": "Technology", "ADBE": "Technology", "CSCO": "Technology",
    "INTC": "Technology", "AMD": "Technology", "QCOM": "Technology", "TXN": "Technology",
    "IBM": "Technology", "NOW": "Technology", "PANW": "Technology", "CRWD": "Technology",
    "PLTR": "Technology", "SNOW": "Technology", "NFLX": "Communication Services",
    "TSM": "Technology", "ASML": "Technology", "BABA": "Consumer Discretionary",
    "PDD": "Consumer Discretionary", "JD": "Consumer Discretionary",
    "F": "Consumer Discretionary", "GM": "Consumer Discretionary",
    "RIVN": "Consumer Discretionary", "LCID": "Consumer Discretionary",
    "PYPL": "Financials", "COIN": "Financials", "SQ": "Financials",
    "ABNB": "Consumer Discretionary", "UBER": "Consumer Discretionary", "LYFT": "Consumer Discretionary",
    "DASH": "Consumer Discretionary", "PINS": "Communication Services", "SNAP": "Communication Services",
    "ZM": "Technology", "DOCU": "Technology", "SHOP": "Technology", "ETSY": "Consumer Discretionary",
    "CHWY": "Consumer Discretionary", "SO": "Utilities",
    "MSTY": "Financials", "CONL": "Financials", "JEPI": "Financials", "JEPQ": "Financials",
    "SCHD": "Financials", "VOO": "Financials", "SPY": "Financials", "QQQ": "Technology",
    "VTI": "Financials", "VXUS": "Financials", "XLK": "Technology", "XLF": "Financials",
    "XLE": "Energy", "XLV": "Healthcare", "XLY": "Consumer Discretionary", "XLP": "Consumer Staples",
    "XLI": "Industrials", "XLB": "Materials", "XLU": "Utilities", "XLRE": "Real Estate",
    "XLC": "Communication Services", "XME": "Materials", "KWEB": "Consumer Discretionary",
    "WELL": "Real Estate", "INVH": "Real Estate", "EQIX": "Real Estate",
    "VSAT": "Technology", "ALL": "Financials", "MSI": "Technology", "LBRDK": "Communication Services",
    "LBRDA": "Communication Services", "LSXMA": "Communication Services", "LSXMB": "Communication Services",
    "FWONA": "Communication Services", "FWONK": "Communication Services",
    "MTDR": "Energy", "HCC": "Energy", "ARCH": "Energy", "BTU": "Energy", "CEIX": "Energy",
    "WMB": "Energy", "ET": "Energy", "EPD": "Energy", "TRGP": "Energy", "KMI": "Energy",
    "EGO": "Materials", "GOLD": "Materials", "AEM": "Materials", "PAAS": "Materials",
    "VALE": "Materials", "RIO": "Materials", "BHP": "Materials", "TECK": "Materials",
    "WYNN": "Consumer Discretionary", "MGM": "Consumer Discretionary", "CZR": "Consumer Discretionary",
    "LVS": "Consumer Discretionary", "PENN": "Consumer Discretionary", "DKNG": "Consumer Discretionary",
    "RBLX": "Communication Services", "U": "Technology", "TTD": "Communication Services",
    "DLO": "Financials", "SOFI": "Financials", "AFRM": "Financials", "UPST": "Financials",
    "COIN": "Financials", "HOOD": "Financials", "BITO": "Financials", "BITQ": "Financials",
    "IBIT": "Financials", "FBTC": "Financials", "BRRR": "Financials",
    # ETFs — classified by their underlying asset class
    "SPY": "Financials", "VOO": "Financials", "IVV": "Financials", "SPYG": "Financials",
    "SPTI": "Financials", "SPLG": "Financials", "XSP": "Financials", "SPYM": "Financials",
    "IWM": "Financials", "VTI": "Financials", "VXUS": "Financials", "VEA": "Financials",
    "EFA": "Financials", "AAXJ": "Financials", "GEM": "Financials", "IEUR": "Financials",
    "HYG": "Financials", "TLH": "Financials", "AGG": "Financials", "BND": "Financials",
    "GOVT": "Financials", "SHV": "Financials", "SGOV": "Financials", "BIL": "Financials",
    "JNK": "Financials", "LQD": "Financials", "IEF": "Financials", "SHY": "Financials",
    "TIP": "Financials", "VTIP": "Financials", "SCHP": "Financials",
    "VNQ": "Real Estate", "VNQI": "Real Estate", "SCHH": "Real Estate", "IYR": "Real Estate",
    "XLE": "Energy", "XOP": "Energy", "OIH": "Energy", "VDE": "Energy", "IYE": "Energy",
    "XLF": "Financials", "KBE": "Financials", "KRE": "Financials", "VFH": "Financials",
    "XLK": "Technology", "VGT": "Technology", "IGV": "Technology", "FTEC": "Technology",
    "XLV": "Healthcare", "VHT": "Healthcare", "IYH": "Healthcare", "XBI": "Healthcare",
    "XLY": "Consumer Discretionary", "VCR": "Consumer Discretionary", "IYC": "Consumer Discretionary",
    "XLP": "Consumer Staples", "VDC": "Consumer Staples", "IYK": "Consumer Staples",
    "XLI": "Industrials", "VIS": "Industrials", "IYJ": "Industrials", "ITA": "Industrials",
    "XLB": "Materials", "VAW": "Materials", "IYM": "Materials", "XME": "Materials",
    "XLU": "Utilities", "VPU": "Utilities", "IDU": "Utilities",
    "XLC": "Communication Services", "VOX": "Communication Services", "IYZ": "Communication Services",
    "XLC": "Communication Services",
    "KWEB": "Consumer Discretionary", "CIBR": "Technology", "HACK": "Technology",
    "XSHQ": "Financials", "XAR": "Industrials", "REGL": "Financials", "TPYP": "Financials",
    "RNWGX": "Financials", "FTGC": "Materials", "EIPI": "Financials",
    "MODG": "Industrials", "GPS": "Consumer Discretionary", "FISV": "Technology",
    "SHLD": "Consumer Discretionary", "TKNO": "Healthcare", "TIC": "Industrials",
}


def _load_cache() -> pd.DataFrame:
    if CACHE_FILE.exists():
        return pd.read_csv(CACHE_FILE)
    return pd.DataFrame(columns=["ticker", "sector"])


def _save_cache(df: pd.DataFrame) -> None:
    df.to_csv(CACHE_FILE, index=False)


def _yfinance_sector(ticker: str) -> str | None:
    try:
        info = yf.Ticker(ticker).info
        return _normalise(info.get("sector"))
    except Exception:
        return None


def _strip_suffix(ticker: str) -> str:
    """'AAPL:US' -> 'AAPL'."""
    return ticker.split(":")[0].strip()


def classify(tickers: list[str], use_yfinance: bool = True, sleep: float = 0.15) -> dict[str, str]:
    cache = _load_cache()
    known = dict(zip(cache["ticker"], cache["sector"]))
    out: dict[str, str] = {}
    to_fetch = []
    for t in tickers:
        t = t.strip()
        base = _strip_suffix(t)
        cached = known.get(base)
        if base in FALLBACK:
            out[t] = FALLBACK[base]
        elif isinstance(cached, str) and cached and cached != "Unknown":
            out[t] = cached
        else:
            to_fetch.append((t, base))
    if use_yfinance and to_fetch:
        print(f"  fetching sectors from yfinance for {len(to_fetch)} unknown tickers ...")
        new_rows = []
        for t, base in to_fetch:
            sec = _yfinance_sector(base)
            time.sleep(sleep)
            if not sec:
                sec = "Unknown"
            out[t] = sec
            known[base] = sec
            new_rows.append({"ticker": base, "sector": sec})
        if new_rows:
            all_rows = pd.concat([cache, pd.DataFrame(new_rows)], ignore_index=True)
            all_rows = all_rows.drop_duplicates(subset=["ticker"], keep="last")
            _save_cache(all_rows)
    else:
        for t, _ in to_fetch:
            out[t] = "Unknown"
    return out


if __name__ == "__main__":
    print(classify(["AAPL:US", "MSFT:US", "XOM:US", "BRK.B:US"], use_yfinance=False))
