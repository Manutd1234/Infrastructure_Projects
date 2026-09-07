# 13F Filings — Sector Rotation across Superinvestors

**Goal:** Scrape Dataroma for the 13F holdings of 8 hedge funds, classify each holding into a GICS sector, and plot sector rotation across quarters (Y-axis = sector weight, X-axis = quarter).

## Hedge funds covered

| Code | Fund |
|---|---|
| `psc` | Bill Ackman — Pershing Square Capital Management |
| `VFC` | Valley Forge Capital Management |
| `AM`  | David Tepper — Appaloosa Management |
| `AC`  | Chuck Akre — Akre Capital Management |
| `BRK` | Warren Buffett — Berkshire Hathaway |
| `HC`  | Li Lu — Himalaya Capital Management |
| `tci` | Chris Hohn — TCI Fund Management |
| `DA`  | Pat Dorsey — Dorsey Asset Management |

## What this folder does

| File | Purpose |
|---|---|
| `funds.py` | The 8 target funds with their Dataroma codes. |
| `dataroma_scraper.py` | Scrapes `https://www.dataroma.com/m/hist/p_hist.php?f=<code>` for every fund. Parses the top-20 holdings per quarter (all available history) into a tidy DataFrame: `fund, quarter, portfolio_value, rank, ticker, company, weight`. Caches raw HTML to `cache/` so re-runs are polite and fast. |
| `sector_classifier.py` | Maps each ticker to a GICS sector. Uses a curated fallback dictionary for ~250 common superinvestor holdings (including delisted tickers like USG, DTV, AGN, BNI, EMC), then falls back to yfinance `Ticker.info['sector']`. Normalises yfinance's sector labels (e.g. "Consumer Cyclical" → "Consumer Discretionary") to canonical GICS names. Caches results to `cache/sectors.csv`. |
| `sector_rotation.py` | Computes sector weights per fund per quarter and produces the rotation charts. |
| `main.py` | Runs the full pipeline and writes outputs. |

## How to run

```bash
pip install -r requirements.txt
python main.py
```

The first run takes a few minutes (mostly yfinance sector lookups for ~280 unknown tickers). Subsequent runs use the cache and finish in seconds. To force a fresh scrape, delete the `cache/` folder.

## Method notes

- **Data source:** Dataroma's free portfolio-history page exposes the **top-20 holdings per quarter** for each fund, with each holding's % of portfolio. That covers ~80–95% of these concentrated funds' book value, which is sufficient for sector-rotation tracking. Full position-level 13F data would require SEC EDGar parsing (out of scope here).
- **Sector weight** for a fund-quarter is the sum of the top-20 holdings' portfolio weights within each GICS sector. It represents the share of the *reported* book allocated to that sector, not the share of the entire portfolio.
- **Sector classification** uses GICS sectors. yfinance's slightly different labels are normalised. Delisted tickers (Dataroma suffixes them with `-OLD`) are resolved against a curated dictionary of historical superinvestor holdings.
- **Coverage:** ~95% of holdings are classified to a real GICS sector; the remaining ~5% are mostly delisted tickers yfinance no longer has data for.

## Outputs (`outputs/`)

- `holdings_raw.csv` — tidy holdings table (6,333 rows, 8 funds, 2006Q4 → 2026Q2).
- `holdings_with_sectors.csv` — same, with a `sector` column.
- `sector_weights.csv` — long-format `fund, quarter, sector, weight`.
- `rotation_<fund>.png` — per-fund stacked bar chart of sector weights over time (8 charts).
- `rotation_aggregate.png` — average sector weights across the 8 funds over time (line chart).
- `sector_heatmap_latest.png` — latest-quarter fund × sector exposure heatmap.

## Key observations (latest quarter, 2026Q2)

- **Berkshire (Buffett):** Financials 34%, Technology 23%, Communication Services 15%, Consumer Staples 14%, Energy 9% — a diversified, large-cap book.
- **Pershing Square (Ackman):** Consumer Discretionary 33%, Financials 30%, Communication Services 14%, Real Estate 11% — concentrated, cyclical tilt.
- **Appaloosa (Tepper):** Technology 38%, Consumer Discretionary 26%, Communication Services 16% — tech-heavy.
- **Akre Capital:** Financials 57%, Technology 24% — extremely concentrated in two sectors.
- **Valley Forge:** Financials 62%, Technology 38% — even more concentrated.
- **TCI (Hohn):** Industrials 46%, Financials 43% — concentrated industrial/financials play.
- **Himalaya (Li Lu):** Communication Services 49% (Alibaba), Consumer Discretionary 25%, Financials 25% — China-focused.
- **Dorsey Asset:** Communication Services 29%, Consumer Discretionary 17%, Healthcare 17%, Technology 17% — diversified growth.

See the per-fund charts in `outputs/` for how these exposures evolved quarter-by-quarter since 2006/2007.
