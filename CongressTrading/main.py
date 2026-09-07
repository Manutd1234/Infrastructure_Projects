"""Main runner for the Congress Trading project.

Pipeline:
  1. Assess feasibility of disclosures-clerk.house.gov (writes markdown report).
  2. Scrape recent trades from Capitol Trades.
  3. Classify each trade's ticker into a GICS sector.
  4. Compute consensus buy/sell (per ticker and per month).
  5. Compute committee-aligned trades using a curated committee -> sector
     and politician -> committee mapping.
  6. Plot sector rotation, party breakdown, and committee alignment.

Outputs (in outputs/):
  house_disclosure_feasibility.md
  trades_raw.csv
  trades_with_sectors.csv
  ticker_consensus.csv
  monthly_consensus.csv
  committee_summary.csv
  sector_rotation.png
  party_sector.png
  committee_alignment.png
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd

from house_disclosure_check import probe as house_probe, write_report as house_report
from capitol_trades_scraper import scrape_trades
from sector_classifier import classify
from consensus import ticker_consensus, monthly_consensus
from committee_signals import add_committee_alignment, committee_summary
from sector_rotation import (
    plot_sector_rotation,
    plot_party_sector,
    plot_committee_alignment,
)

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)


def main(max_pages: int = 60, use_cache: bool = True, use_yfinance: bool = True):
    print("Step 1: assess house.gov feasibility ...")
    probe_res = house_probe()
    house_report(probe_res)
    print(f"  report -> outputs/house_disclosure_feasibility.md")

    print("Step 2: scrape Capitol Trades ...")
    trades = scrape_trades(max_pages=max_pages, use_cache=use_cache)
    if trades.empty:
        raise RuntimeError("No trades scraped; check network / Capitol Trades availability.")
    trades.to_csv(OUT / "trades_raw.csv", index=False)
    print(f"  {len(trades)} trades scraped ({trades['politician_id'].nunique()} politicians, "
          f"{trades['ticker'].nunique()} tickers)")
    print(f"  date range: {trades['traded'].min()} -> {trades['traded'].max()}")

    print("Step 3: classify tickers by sector ...")
    tickers = sorted(trades["ticker"].dropna().unique())
    sec_map = classify(tickers, use_yfinance=use_yfinance)
    trades["sector"] = trades["ticker"].map(sec_map).fillna("Unknown")
    trades.to_csv(OUT / "trades_with_sectors.csv", index=False)
    print(f"  sector counts:\n{trades['sector'].value_counts()}")

    print("Step 4: consensus buy/sell ...")
    tcon = ticker_consensus(trades)
    tcon.to_csv(OUT / "ticker_consensus.csv", index=False)
    print(f"  {len(tcon)} tickers with consensus. Top 5 BUY:")
    print(tcon.head(5)[["ticker", "issuer", "sector", "n_buy", "n_sell", "net_signed_usd", "consensus"]].to_string(index=False))
    print(f"  Top 5 SELL:")
    print(tcon.tail(5)[["ticker", "issuer", "sector", "n_buy", "n_sell", "net_signed_usd", "consensus"]].to_string(index=False))
    mcon = monthly_consensus(trades)
    mcon.to_csv(OUT / "monthly_consensus.csv", index=False)

    print("Step 5: committee relevance signals ...")
    trades = add_committee_alignment(trades)
    csum = committee_summary(trades)
    csum.to_csv(OUT / "committee_summary.csv", index=False)
    n_aligned = int(trades["committee_aligned"].sum())
    print(f"  {n_aligned}/{len(trades)} trades are committee-aligned "
          f"({n_aligned/len(trades)*100:.1f}%)")
    if not csum.empty:
        print(csum.to_string(index=False))

    print("Step 6: plots ...")
    plot_sector_rotation(trades, OUT / "sector_rotation.png")
    plot_party_sector(trades, OUT / "party_sector.png")
    plot_committee_alignment(trades, OUT / "committee_alignment.png")
    print("  sector_rotation.png, party_sector.png, committee_alignment.png written")

    print(f"\nAll outputs written to {OUT}")


if __name__ == "__main__":
    main(max_pages=60, use_cache=True, use_yfinance=True)
