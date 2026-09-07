"""Dataroma scraper.

Pulls the per-fund portfolio history page
(https://www.dataroma.com/m/hist/p_hist.php?f=<code>) which lists the
top-20 holdings for every historical 13F quarter, with each holding's
% of portfolio. Returns a tidy DataFrame:

    fund | quarter | quarter_label | portfolio_value | rank | ticker | company | weight

The history page only exposes the top-20 positions per quarter (Dataroma's
free tier). That is enough to track sector rotation because the top-20
typically captures >80% of these concentrated funds' book value.
"""

from __future__ import annotations

import re
import time
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

BASE = "https://www.dataroma.com"
HISTORY_PATH = "/m/hist/p_hist.php"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)


def _cache_path(fund: str) -> Path:
    return CACHE_DIR / f"{fund}.html"


def _fetch(fund: str, use_cache: bool = True, sleep: float = 1.0) -> str:
    """Fetch the portfolio-history HTML for a fund, with on-disk caching."""
    cache = _cache_path(fund)
    if use_cache and cache.exists():
        age_h = (time.time() - cache.stat().st_mtime) / 3600.0
        if age_h < 12.0:
            return cache.read_text()
    url = BASE + HISTORY_PATH + f"?f={fund}"
    r = requests.get(url, headers=HEADERS, timeout=30)
    r.raise_for_status()
    cache.write_text(r.text)
    time.sleep(sleep)  # be polite
    return r.text


_WEIGHT_RE = re.compile(r"([\d.]+)%\s*of\s*portfolio", re.IGNORECASE)
_PERIOD_RE = re.compile(r"(\d{4})\s*Q([1-4])")


def parse_history(html: str, fund: str) -> pd.DataFrame:
    """Parse the portfolio-history HTML into a tidy DataFrame."""
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if table is None:
        return pd.DataFrame(columns=["fund", "quarter", "quarter_label",
                                     "portfolio_value", "rank", "ticker", "company", "weight"])
    rows = []
    for tr in table.find_all("tr"):
        tds = tr.find_all("td")
        if not tds:
            continue
        period_text = tds[0].get_text(strip=True)
        m = _PERIOD_RE.search(period_text)
        if not m:
            continue
        year, q = int(m.group(1)), int(m.group(2))
        quarter = f"{year}Q{q}"
        portfolio_value = tds[1].get_text(strip=True) if len(tds) > 1 else ""
        # Remaining cells are holdings (top-20), in rank order
        for rank, cell in enumerate(tds[2:], start=1):
            sym_link = cell.find("a", href=re.compile(r"sym="))
            if sym_link is None:
                continue
            ticker = sym_link.get_text(strip=True)
            href = sym_link.get("href", "")
            sym_match = re.search(r"sym=([^&]+)", href)
            if sym_match:
                ticker = sym_match.group(1)
            company_b = cell.find("b")
            company = company_b.get_text(strip=True) if company_b else ""
            wm = _WEIGHT_RE.search(cell.get_text(" ", strip=True))
            weight = float(wm.group(1)) / 100.0 if wm else float("nan")
            rows.append(
                {
                    "fund": fund,
                    "quarter": quarter,
                    "quarter_label": period_text.replace("\xa0", " "),
                    "portfolio_value": portfolio_value,
                    "rank": rank,
                    "ticker": ticker,
                    "company": company,
                    "weight": weight,
                }
            )
    return pd.DataFrame(rows)


def scrape_fund(fund: str, use_cache: bool = True) -> pd.DataFrame:
    html = _fetch(fund, use_cache=use_cache)
    return parse_history(html, fund)


def scrape_all(funds: dict[str, str], use_cache: bool = True) -> pd.DataFrame:
    """Scrape every fund in the {code: name} mapping and return one big DataFrame."""
    frames = []
    for code in funds:
        print(f"  scraping {code} ({funds[code]}) ...")
        try:
            frames.append(scrape_fund(code, use_cache=use_cache))
        except Exception as e:
            print(f"    ERROR for {code}: {e}")
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()


if __name__ == "__main__":
    df = scrape_fund("BRK")
    print(df.head(25).to_string(index=False))
    print(f"\n{len(df)} rows, quarters: {sorted(df['quarter'].unique())}")
