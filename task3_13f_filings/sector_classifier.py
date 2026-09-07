"""Sector classifier for stock tickers.

Primary source: yfinance `Ticker.info['sector']` (GICS sector).
Fallback: a hand-curated mapping for the most common superinvestor holdings
so we don't depend on the network for well-known names.

Results are cached to `cache/sectors.csv` so re-runs are instant and we only
hit yfinance for tickers we have never seen before.
"""

from __future__ import annotations

import time
from pathlib import Path

import pandas as pd
import yfinance as yf

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
CACHE_FILE = CACHE_DIR / "sectors.csv"

# yfinance uses slightly different sector labels than GICS. Normalise so all
# sectors use the canonical GICS names.
YF_TO_GICS = {
    "Consumer Cyclical": "Consumer Discretionary",
    "Consumer Defensive": "Consumer Staples",
    "Financial Services": "Financials",
    "Basic Materials": "Materials",
    "Industrials": "Industrials",
    "Technology": "Technology",
    "Healthcare": "Healthcare",
    "Communication Services": "Communication Services",
    "Energy": "Energy",
    "Utilities": "Utilities",
    "Real Estate": "Real Estate",
    "Materials": "Materials",
}


def _normalise(sector: str | None) -> str:
    if not sector:
        return "Unknown"
    return YF_TO_GICS.get(sector, sector)

# Curated fallback for tickers that frequently appear in superinvestor 13Fs.
# GICS sectors used: Technology, Financials, Healthcare, Consumer Staples,
# Consumer Discretionary, Communication Services, Industrials, Energy,
# Utilities, Real Estate, Materials.
FALLBACK = {
    # Technology
    "AAPL": "Technology", "MSFT": "Technology", "NVDA": "Technology", "TSM": "Technology",
    "AVGO": "Technology", "ORCL": "Technology", "CRM": "Technology", "ADBE": "Technology",
    "CSCO": "Technology", "INTC": "Technology", "AMD": "Technology", "QCOM": "Technology",
    "TXN": "Technology", "IBM": "Technology", "NOW": "Technology", "PANW": "Technology",
    "FTNT": "Technology", "SNPS": "Technology", "CDNS": "Technology", "ANET": "Technology",
    "MU": "Technology", "AMAT": "Technology", "LRCX": "Technology", "KLAC": "Technology",
    "MRVL": "Technology", "ACN": "Technology", "IT": "Technology", "DELL": "Technology",
    "HPE": "Technology", "PLTR": "Technology", "SNOW": "Technology", "DDOG": "Technology",
    "MDB": "Technology", "NET": "Technology", "CRWD": "Technology", "ZS": "Technology",
    "FIS": "Technology", "FISV": "Technology", "GPN": "Technology", "VRSN": "Technology",
    "AKAM": "Technology", "FFIV": "Technology", "SABR": "Technology", "KEYS": "Technology",
    # Communication Services
    "GOOGL": "Communication Services", "GOOG": "Communication Services",
    "META": "Communication Services", "PINS": "Communication Services",
    "SNAP": "Communication Services", "RBLX": "Communication Services",
    "NFLX": "Communication Services", "DIS": "Communication Services",
    "CMCSA": "Communication Services", "T": "Communication Services",
    "VZ": "Communication Services", "TMUS": "Communication Services",
    "CHTR": "Communication Services", "WBD": "Communication Services",
    "PARA": "Communication Services", "FOXA": "Communication Services",
    "FOX": "Communication Services", "NWSA": "Communication Services",
    "NYT": "Communication Services", "SIRI": "Communication Services",
    "TTD": "Communication Services", "ROKU": "Communication Services",
    "LLYVK": "Communication Services", "LLYVA": "Communication Services",
    "LSXMA": "Communication Services", "LSXMB": "Communication Services",
    "LSXMK": "Communication Services", "FWONA": "Communication Services",
    "FWONK": "Communication Services",
    # Consumer Discretionary
    "AMZN": "Consumer Discretionary", "TSLA": "Consumer Discretionary",
    "HD": "Consumer Discretionary", "LOW": "Consumer Discretionary",
    "MCD": "Consumer Discretionary", "SBUX": "Consumer Discretionary",
    "NKE": "Consumer Discretionary", "TJX": "Consumer Discretionary",
    "BKNG": "Consumer Discretionary", "ABNB": "Consumer Discretionary",
    "DASH": "Consumer Discretionary", "UBER": "Consumer Discretionary",
    "LYFT": "Consumer Discretionary", "AZO": "Consumer Discretionary",
    "ORLY": "Consumer Discretionary", "AAP": "Consumer Discretionary",
    "ULTA": "Consumer Discretionary", "DPZ": "Consumer Discretionary",
    "CMG": "Consumer Discretionary", "YUM": "Consumer Discretionary",
    "LULU": "Consumer Discretionary", "RL": "Consumer Discretionary",
    "VFC": "Consumer Discretionary", "TPR": "Consumer Discretionary",
    "LEN": "Consumer Discretionary", "DHI": "Consumer Discretionary",
    "PHM": "Consumer Discretionary", "KBH": "Consumer Discretionary",
    "TOL": "Consumer Discretionary", "NVR": "Consumer Discretionary",
    "M": "Consumer Discretionary", "KSS": "Consumer Discretionary",
    "JWN": "Consumer Discretionary", "DDS": "Consumer Discretionary",
    "DKNG": "Consumer Discretionary", "CZR": "Consumer Discretionary",
    "MGM": "Consumer Discretionary", "WYNN": "Consumer Discretionary",
    "LVS": "Consumer Discretionary", "PENN": "Consumer Discretionary",
    "TKO": "Consumer Discretionary", "LPX": "Consumer Discretionary",
    # Consumer Staples
    "COST": "Consumer Staples", "WMT": "Consumer Staples", "PG": "Consumer Staples",
    "KO": "Consumer Staples", "PEP": "Consumer Staples", "MDLZ": "Consumer Staples",
    "CL": "Consumer Staples", "KMB": "Consumer Staples", "GIS": "Consumer Staples",
    "HSY": "Consumer Staples", "STZ": "Consumer Staples", "DEO": "Consumer Staples",
    "BF.B": "Consumer Staples", "TAP": "Consumer Staples", "SYY": "Consumer Staples",
    "WBA": "Consumer Staples", "KR": "Consumer Staples", "CAG": "Consumer Staples",
    "MKC": "Consumer Staples", "SJM": "Consumer Staples", "HRL": "Consumer Staples",
    "TGT": "Consumer Staples", "DG": "Consumer Staples", "KHC": "Consumer Staples",
    # Financials
    "JPM": "Financials", "BAC": "Financials", "WFC": "Financials", "C": "Financials",
    "GS": "Financials", "MS": "Financials", "AXP": "Financials", "BLK": "Financials",
    "SCHW": "Financials", "BK": "Financials", "USB": "Financials", "PNC": "Financials",
    "TFC": "Financials", "COF": "Financials", "ALLY": "Financials", "FITB": "Financials",
    "RF": "Financials", "KEY": "Financials", "MTB": "Financials", "HBAN": "Financials",
    "CFG": "Financials", "NTRS": "Financials", "STT": "Financials", "AON": "Financials",
    "MMC": "Financials", "BRO": "Financials", "AJG": "Financials", "WRB": "Financials",
    "CB": "Financials", "PGR": "Financials", "TRV": "Financials", "ALL": "Financials",
    "MET": "Financials", "PRU": "Financials", "AFL": "Financials", "UNM": "Financials",
    "L": "Financials", "MKL": "Financials", "Y": "Financials",
    "BRK.A": "Financials", "BRK.B": "Financials", "BRK": "Financials",
    "GL": "Financials", "MCO": "Financials", "SPGI": "Financials", "MORN": "Financials",
    "FDS": "Financials", "NDAQ": "Financials", "ICE": "Financials", "CME": "Financials",
    "TROW": "Financials", "BEN": "Financials", "JEF": "Financials",
    "KKR": "Financials", "APO": "Financials", "BX": "Financials", "CG": "Financials",
    "ARES": "Financials", "LPL": "Financials", "BN": "Financials", "BAM": "Financials",
    "V": "Financials", "MA": "Financials",
    # Healthcare
    "JNJ": "Healthcare", "LLY": "Healthcare", "PFE": "Healthcare", "MRK": "Healthcare",
    "ABBV": "Healthcare", "MRNA": "Healthcare", "BNTX": "Healthcare", "GILD": "Healthcare",
    "AMGN": "Healthcare", "BMY": "Healthcare", "REGN": "Healthcare", "VRTX": "Healthcare",
    "DHR": "Healthcare", "TMO": "Healthcare", "ABT": "Healthcare", "MDT": "Healthcare",
    "ISRG": "Healthcare", "SYK": "Healthcare", "BSX": "Healthcare", "EW": "Healthcare",
    "ZBH": "Healthcare", "HOLX": "Healthcare", "PKI": "Healthcare", "WAT": "Healthcare",
    "ILMN": "Healthcare", "IQV": "Healthcare", "CNC": "Healthcare", "MOH": "Healthcare",
    "UNH": "Healthcare", "HUM": "Healthcare", "CI": "Healthcare", "ELV": "Healthcare",
    "DVA": "Healthcare", "COR": "Healthcare", "FMS": "Healthcare", "PHG": "Healthcare",
    "NTRA": "Healthcare", "GH": "Healthcare",
    # Energy
    "XOM": "Energy", "CVX": "Energy", "COP": "Energy", "SLB": "Energy", "EOG": "Energy",
    "PSX": "Energy", "MPC": "Energy", "VLO": "Energy", "HES": "Energy", "OXY": "Energy",
    "PXD": "Energy", "DVN": "Energy", "FANG": "Energy", "CTRA": "Energy", "RRC": "Energy",
    "AR": "Energy", "CHK": "Energy", "OVV": "Energy", "EQT": "Energy", "WMB": "Energy",
    "ET": "Energy", "EPD": "Energy", "MPLX": "Energy", "PBA": "Energy", "TRGP": "Energy",
    "KMI": "Energy", "OKE": "Energy", "NOV": "Energy", "BKR": "Energy", "HAL": "Energy",
    "SUN": "Energy", "MUR": "Energy", "APA": "Energy", "BTU": "Energy", "ARCH": "Energy",
    "CEIX": "Energy", "HCC": "Energy", "NOG": "Energy", "ENB": "Energy", "TRP": "Energy",
    # Industrials
    "BA": "Industrials", "CAT": "Industrials", "DE": "Industrials", "GE": "Industrials",
    "HON": "Industrials", "RTX": "Industrials", "LMT": "Industrials", "NOC": "Industrials",
    "GD": "Industrials", "TXT": "Industrials", "UPS": "Industrials", "FDX": "Industrials",
    "UNP": "Industrials", "CSX": "Industrials", "NSC": "Industrials", "DAL": "Industrials",
    "LUV": "Industrials", "UAL": "Industrials", "AAL": "Industrials", "ALK": "Industrials",
    "ODFL": "Industrials", "JBHT": "Industrials", "KNX": "Industrials", "XPO": "Industrials",
    "CHRW": "Industrials", "EMR": "Industrials", "ETN": "Industrials", "ITW": "Industrials",
    "PH": "Industrials", "ROK": "Industrials", "DOV": "Industrials", "AME": "Industrials",
    "PWR": "Industrials", "MMM": "Industrials", "FAST": "Industrials", "FLS": "Industrials",
    "CMI": "Industrials", "PCAR": "Industrials", "ALSN": "Industrials", "TDG": "Industrials",
    "CW": "Industrials", "HUBB": "Industrials", "HII": "Industrials", "LHX": "Industrials",
    "FLR": "Industrials", "ACM": "Industrials",
    # Materials
    "LIN": "Materials", "SHW": "Materials", "APD": "Materials", "NEM": "Materials",
    "FCX": "Materials", "NUE": "Materials", "STLD": "Materials", "X": "Materials",
    "CLF": "Materials", "AA": "Materials", "ATI": "Materials", "EMN": "Materials",
    "FMC": "Materials", "MOS": "Materials", "CF": "Materials", "ALB": "Materials",
    "ECL": "Materials", "VMC": "Materials", "MLM": "Materials", "SUM": "Materials",
    "EXP": "Materials", "CRH": "Materials", "CE": "Materials", "DOW": "Materials",
    "LYB": "Materials", "EGO": "Materials", "AEM": "Materials", "GOLD": "Materials",
    "PAAS": "Materials", "VALE": "Materials", "RIO": "Materials", "BHP": "Materials",
    "TECK": "Materials",
    # Real Estate
    "AMT": "Real Estate", "PLD": "Real Estate", "EQIX": "Real Estate", "SPG": "Real Estate",
    "O": "Real Estate", "WELL": "Real Estate", "AVB": "Real Estate", "EQR": "Real Estate",
    "INVH": "Real Estate", "EXR": "Real Estate", "ARE": "Real Estate", "BXP": "Real Estate",
    "VTR": "Real Estate", "DLR": "Real Estate", "PSA": "Real Estate", "MAA": "Real Estate",
    "UDR": "Real Estate", "CPT": "Real Estate", "FRT": "Real Estate", "HST": "Real Estate",
    "RHP": "Real Estate", "GLPI": "Real Estate", "PEAK": "Real Estate", "VNO": "Real Estate",
    "SLG": "Real Estate", "HHH": "Real Estate",
    # Utilities
    "NEE": "Utilities", "DUK": "Utilities", "SO": "Utilities", "AEP": "Utilities",
    "EXC": "Utilities", "SRE": "Utilities", "XEL": "Utilities", "WEC": "Utilities",
    "ED": "Utilities", "D": "Utilities", "PEG": "Utilities", "EIX": "Utilities",
    "ETR": "Utilities", "PPL": "Utilities", "FE": "Utilities", "AWK": "Utilities",
    "AWK_UN": "Utilities", "WTR": "Utilities", "CWT": "Utilities", "ARTNA": "Utilities",
    "YORW": "Utilities",
    # Common delisted / historical superinvestor holdings
    "USG": "Materials", "DTV": "Communication Services", "AGN": "Healthcare",
    "BNI": "Industrials", "EMC": "Technology", "JCP": "Consumer Discretionary",
    "GGP": "Real Estate", "AABA": "Communication Services", "WPZ": "Energy",
    "ETP": "Energy", "CBI": "Industrials", "LCC": "Industrials",
    "ALEX": "Industrials", "SHLDQ": "Consumer Discretionary", "TERP": "Utilities",
    "PRMW": "Consumer Staples", "BKW": "Consumer Discretionary", "DHIL": "Financials",
    "SMAR": "Technology", "ANSS": "Technology", "AZPN": "Technology", "AY": "Utilities",
    "WSC": "Industrials", "PAH": "Materials", "BGP": "Consumer Discretionary",
    "XLE": "Energy", "DESP": "Consumer Discretionary", "SEMR": "Technology",
    "ESGR": "Financials", "PARA": "Communication Services",
}


def _load_cache() -> pd.DataFrame:
    if CACHE_FILE.exists():
        df = pd.read_csv(CACHE_FILE)
        # Normalise any cached yfinance sector names to GICS
        if "sector" in df.columns:
            df["sector"] = df["sector"].map(lambda s: _normalise(s) if isinstance(s, str) else s)
        return df
    return pd.DataFrame(columns=["ticker", "sector"])


def _save_cache(df: pd.DataFrame) -> None:
    df.to_csv(CACHE_FILE, index=False)


def _yfinance_sector(ticker: str) -> str | None:
    """Try to fetch sector from yfinance. Returns None on failure."""
    try:
        info = yf.Ticker(ticker).info
        return _normalise(info.get("sector"))
    except Exception:
        return None


def classify(tickers: list[str], use_yfinance: bool = True, sleep: float = 0.2) -> dict[str, str]:
    """Return {ticker: sector} for every ticker, using cache + fallback + yfinance."""
    cache = _load_cache()
    known = dict(zip(cache["ticker"], cache["sector"]))
    out = {}
    to_fetch = []
    for t in tickers:
        t = t.strip()
        cached = known.get(t)
        if t in FALLBACK:
            out[t] = FALLBACK[t]
        elif isinstance(cached, str) and cached and cached != "Unknown":
            out[t] = cached
        else:
            # Try stripping Dataroma's "-OLD" suffix (delisted tickers)
            base = t.replace("-OLD", "")
            if base != t and base in FALLBACK:
                out[t] = FALLBACK[base]
            elif base != t and isinstance(known.get(base), str) and known[base] and known[base] != "Unknown":
                out[t] = known[base]
            else:
                to_fetch.append(t)
    if use_yfinance and to_fetch:
        print(f"  fetching sectors from yfinance for {len(to_fetch)} unknown tickers ...")
        for t in to_fetch:
            sec = _yfinance_sector(t)
            time.sleep(sleep)
            if sec:
                out[t] = sec
            else:
                out[t] = "Unknown"
            known[t] = out[t]
        _save_cache(pd.DataFrame(
            [{"ticker": k, "sector": v} for k, v in known.items() if isinstance(v, str)]
        ))
    else:
        for t in to_fetch:
            out[t] = "Unknown"
    return out


if __name__ == "__main__":
    test = ["AAPL", "XOM", "JPM", "LLYVK", "BRK.B", "QQQ", "SPY"]
    print(classify(test, use_yfinance=False))
