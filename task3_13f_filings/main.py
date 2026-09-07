"""Main runner for Task 3: 13F Filings sector rotation.

Pipeline:
  1. Scrape Dataroma portfolio history for the 8 target hedge funds
     (top-20 holdings per quarter, all available history).
  2. Classify every ticker into a GICS sector (yfinance + curated fallback).
  3. Compute sector weights per fund per quarter.
  4. Plot sector rotation charts (per fund + aggregate + heatmap).

Outputs (in outputs/):
  holdings_raw.csv         - tidy holdings table
  holdings_with_sectors.csv - holdings + sector column
  sector_weights.csv       - long-format sector weights
  rotation_<fund>.png      - per-fund stacked bar rotation
  rotation_aggregate.png   - aggregate line chart
  sector_heatmap_latest.png - latest-quarter fund x sector heatmap
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from funds import FUNDS, SHORT_NAME
from dataroma_scraper import scrape_all
from sector_rotation import (
    add_sectors,
    sector_weights,
    plot_fund_rotation,
    plot_aggregate_rotation,
    plot_sector_heatmap,
)

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)


def main(use_cache: bool = True, use_yfinance: bool = True):
    print("Step 1: scrape Dataroma portfolio history ...")
    holdings = scrape_all(FUNDS, use_cache=use_cache)
    print(f"  total rows: {len(holdings)}")
    if holdings.empty:
        raise RuntimeError("No holdings scraped; check network / Dataroma availability.")
    holdings.to_csv(OUT / "holdings_raw.csv", index=False)
    print(f"  funds scraped: {sorted(holdings['fund'].unique())}")
    print(f"  quarter range: {holdings['quarter'].min()} -> {holdings['quarter'].max()}")

    print("Step 2: classify tickers by GICS sector ...")
    holdings = add_sectors(holdings, use_yfinance=use_yfinance)
    holdings.to_csv(OUT / "holdings_with_sectors.csv", index=False)
    print(f"  sector counts:\n{holdings['sector'].value_counts()}")

    print("Step 3: compute sector weights ...")
    weights = sector_weights(holdings)
    weights.to_csv(OUT / "sector_weights.csv", index=False)
    print(f"  {len(weights)} fund-quarter-sector rows")

    print("Step 4: plot sector rotation ...")
    for code, name in FUNDS.items():
        if code not in weights["fund"].unique():
            print(f"  ! no data for {code}, skipping")
            continue
        short = SHORT_NAME.get(code, code)
        plot_fund_rotation(weights, code, name, OUT / f"rotation_{code}.png")
        print(f"  plotted rotation_{code}.png")
    plot_aggregate_rotation(weights, SHORT_NAME, OUT / "rotation_aggregate.png")
    plot_sector_heatmap(weights, SHORT_NAME, OUT / "sector_heatmap_latest.png")
    print("  plotted rotation_aggregate.png and sector_heatmap_latest.png")

    # Quick textual summary of latest quarter
    latest_q = weights["quarter"].max()
    print(f"\nLatest quarter ({latest_q}) sector exposure by fund:")
    latest = weights[weights["quarter"] == latest_q].pivot_table(
        index="fund", columns="sector", values="weight", aggfunc="sum"
    ).fillna(0)
    latest.index = [SHORT_NAME.get(f, f) for f in latest.index]
    print((latest * 100).round(1).to_string())

    print(f"\nAll outputs written to {OUT}")


if __name__ == "__main__":
    main(use_cache=True, use_yfinance=True)
