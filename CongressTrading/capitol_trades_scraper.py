"""Capitol Trades scraper.

Scrapes https://www.capitoltrades.com/trades?page=<N> and parses the
server-rendered HTML table into a tidy DataFrame, one row per trade:

    trade_id | politician_id | politician | party | chamber | state |
    issuer | ticker | published | traded | filed_after_days | owner |
    trade_type | size | price

The site exposes 12 trades per page. We paginate up to `max_pages` and
sleep between requests to be polite. Results are cached to
`cache/trades.parquet`-equivalent CSV so re-runs are instant.

Note: Capitol Trades is operated by 2iQ Research and aggregates the
official House/Senate disclosures. Historical data is limited to the past
3 years on the free tier.
"""

from __future__ import annotations

import re
import time
from pathlib import Path

import pandas as pd
import requests
from bs4 import BeautifulSoup

BASE = "https://www.capitoltrades.com"
TRADES_PATH = "/trades"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
)
HEADERS = {"User-Agent": UA, "Accept-Language": "en-US,en;q=0.9"}

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
CACHE_FILE = CACHE_DIR / "trades.csv"

_SIZE_RE = re.compile(r"([0-9KMBkmb]+)\s*[–-]\s*([0-9KMBkmb]+)")
_PRICE_RE = re.compile(r"\$?([\d,]+\.\d+)")


def _parse_date(text: str) -> str:
    """Capitol Trades prints dates like '4 Sept 2026' or '4 Sept\\n2026'."""
    text = re.sub(r"\s+", " ", text.strip())
    try:
        return pd.to_datetime(text, format="%d %b %Y").strftime("%Y-%m-%d")
    except Exception:
        try:
            return pd.to_datetime(text).strftime("%Y-%m-%d")
        except Exception:
            return ""


def _parse_size(text: str) -> tuple[str, float, float]:
    """Return (raw, low, high) in USD. Ranges like '1K–15K' -> (1000, 15000)."""
    raw = text.strip()
    m = _SIZE_RE.search(raw)
    if not m:
        return raw, float("nan"), float("nan")

    def _to_num(s: str) -> float:
        s = s.strip()
        mult = 1.0
        if s.endswith(("K", "k")):
            mult, s = 1e3, s[:-1]
        elif s.endswith(("M", "m")):
            mult, s = 1e6, s[:-1]
        elif s.endswith(("B", "b")):
            mult, s = 1e9, s[:-1]
        try:
            return float(s) * mult
        except ValueError:
            return float("nan")

    return raw, _to_num(m.group(1)), _to_num(m.group(2))


def _parse_price(text: str) -> float:
    m = _PRICE_RE.search(text)
    if m:
        return float(m.group(1).replace(",", ""))
    return float("nan")


def _parse_politician_cell(cell) -> dict:
    a = cell.find("a", href=re.compile(r"/politicians/"))
    pol_id = re.search(r"/politicians/([^/?#]+)", a["href"]).group(1) if a else ""
    name = a.get_text(strip=True) if a else ""
    rest = cell.get_text(" ", strip=True).replace(name, "", 1).strip()
    # rest looks like "Democrat House IL"
    parts = rest.split()
    party = parts[0] if len(parts) >= 1 else ""
    chamber = parts[1] if len(parts) >= 2 else ""
    state = parts[2] if len(parts) >= 3 else ""
    return {
        "politician_id": pol_id,
        "politician": name,
        "party": party,
        "chamber": chamber,
        "state": state,
    }


def _parse_issuer_cell(cell) -> dict:
    a = cell.find("a", href=re.compile(r"/issuers/"))
    issuer = a.get_text(strip=True) if a else ""
    text = cell.get_text(" ", strip=True)
    # ticker is the trailing token like "VSAT:US"
    m = re.search(r"\b([A-Z0-9._-]+:[A-Z]{2})\s*$", text)
    ticker = m.group(1) if m else ""
    return {"issuer": issuer, "ticker": ticker}


def parse_trades_html(html: str) -> pd.DataFrame:
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if table is None:
        return pd.DataFrame()
    rows = []
    for tr in table.find_all("tr"):
        tds = tr.find_all("td")
        if len(tds) < 9:
            continue
        pol = _parse_politician_cell(tds[0])
        iss = _parse_issuer_cell(tds[1])
        published = _parse_date(tds[2].get_text(" ", strip=True))
        traded = _parse_date(tds[3].get_text(" ", strip=True))
        filed_after = tds[4].get_text(" ", strip=True).replace("days", "").strip()
        try:
            filed_after = float(filed_after)
        except ValueError:
            filed_after = float("nan")
        owner = tds[5].get_text(strip=True)
        trade_type = tds[6].get_text(strip=True).lower()
        size_raw, size_low, size_high = _parse_size(tds[7].get_text(" ", strip=True))
        price = _parse_price(tds[8].get_text(" ", strip=True))
        detail_link = tds[9].find("a", href=re.compile(r"/trades/"))
        trade_id = re.search(r"/trades/(\d+)", detail_link["href"]).group(1) if detail_link else ""
        rows.append(
            {
                "trade_id": trade_id,
                **pol,
                **iss,
                "published": published,
                "traded": traded,
                "filed_after_days": filed_after,
                "owner": owner,
                "trade_type": trade_type,
                "size_raw": size_raw,
                "size_low_usd": size_low,
                "size_high_usd": size_high,
                "price": price,
            }
        )
    return pd.DataFrame(rows)


def scrape_page(page: int, session: requests.Session | None = None, timeout: int = 20) -> pd.DataFrame:
    s = session or requests
    url = f"{BASE}{TRADES_PATH}?page={page}"
    r = s.get(url, headers=HEADERS, timeout=timeout)
    r.raise_for_status()
    return parse_trades_html(r.text)


def scrape_trades(max_pages: int = 50, sleep: float = 0.6, use_cache: bool = True) -> pd.DataFrame:
    """Scrape up to `max_pages` of recent trades. Cached to disk."""
    if use_cache and CACHE_FILE.exists():
        try:
            cached = pd.read_csv(CACHE_FILE)
            # Heuristic: if cache has >= max_pages * 10 rows, reuse it
            if len(cached) >= max_pages * 10:
                print(f"  using cached trades ({len(cached)} rows)")
                return cached
        except Exception:
            pass
    session = requests.Session()
    frames = []
    for page in range(1, max_pages + 1):
        try:
            df = scrape_page(page, session=session)
            if df.empty:
                print(f"  page {page}: empty, stopping")
                break
            frames.append(df)
            print(f"  page {page}: {len(df)} trades")
            time.sleep(sleep)
        except Exception as e:
            print(f"  page {page}: ERROR {e}")
            break
    if not frames:
        return pd.DataFrame()
    out = pd.concat(frames, ignore_index=True).drop_duplicates(subset=["trade_id"])
    out.to_csv(CACHE_FILE, index=False)
    return out


if __name__ == "__main__":
    df = scrape_trades(max_pages=3)
    print(df.head().to_string())
    print(f"\n{len(df)} trades scraped")
