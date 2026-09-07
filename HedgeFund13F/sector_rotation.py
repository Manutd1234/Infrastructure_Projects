"""Sector rotation analysis for 13F holdings.

Takes the tidy holdings DataFrame from `dataroma_scraper` and produces:
  - sector_weights:   fund x quarter x sector weight matrix
  - sector_weights.csv: long-format CSV
  - per-fund stacked area chart of sector weights over time
  - aggregate (8-fund) sector rotation chart
"""

from __future__ import annotations

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from sector_classifier import classify

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)

# Canonical GICS sector order for nicer charts
SECTOR_ORDER = [
    "Technology", "Communication Services", "Financials", "Healthcare",
    "Consumer Discretionary", "Consumer Staples", "Industrials", "Energy",
    "Materials", "Real Estate", "Utilities", "Unknown",
]


def _sort_quarters(qs: list[str]) -> list[str]:
    return sorted(qs, key=lambda s: (int(s[:4]), int(s[-1])))


def add_sectors(holdings: pd.DataFrame, use_yfinance: bool = True) -> pd.DataFrame:
    """Attach a `sector` column to the holdings DataFrame."""
    tickers = sorted(holdings["ticker"].unique())
    print(f"  classifying {len(tickers)} unique tickers ...")
    sec_map = classify(tickers, use_yfinance=use_yfinance)
    holdings = holdings.copy()
    holdings["sector"] = holdings["ticker"].map(sec_map).fillna("Unknown")
    return holdings


def sector_weights(holdings: pd.DataFrame) -> pd.DataFrame:
    """Compute sector weight = sum of holding weights within each fund-quarter.

    Note: weights are sums of the top-20 holdings' % of portfolio, so they
    capture the *share of the reported book* allocated to each sector, not the
    share of the entire portfolio. This is consistent across funds and time
    and is the right quantity for rotation analysis.
    """
    df = holdings.groupby(["fund", "quarter", "sector"], as_index=False)["weight"].sum()
    return df


def _pivot_for_chart(weights: pd.DataFrame, fund: str) -> pd.DataFrame:
    sub = weights[weights["fund"] == fund]
    pivot = sub.pivot_table(index="quarter", columns="sector", values="weight", aggfunc="sum").fillna(0)
    pivot = pivot.reindex(_sort_quarters(pivot.index.tolist()))
    # Order columns by canonical sector order, drop all-zero columns
    cols = [c for c in SECTOR_ORDER if c in pivot.columns and pivot[c].sum() > 0]
    return pivot[cols]


def plot_fund_rotation(weights: pd.DataFrame, fund: str, fund_name: str, path: Path):
    pivot = _pivot_for_chart(weights, fund)
    if pivot.empty:
        return
    fig, ax = plt.subplots(figsize=(13, 6))
    bottom = np.zeros(len(pivot))
    x = range(len(pivot))
    for col in pivot.columns:
        vals = pivot[col].values * 100
        ax.bar(x, vals, bottom=bottom, label=col, width=0.9)
        bottom += vals
    ax.set_xticks(list(x))
    ax.set_xticklabels(pivot.index, rotation=90, fontsize=7)
    ax.set_title(f"Sector rotation — {fund_name} (top-20 13F holdings)")
    ax.set_ylabel("% of reported portfolio (top-20)")
    ax.set_ylim(0, max(bottom.max() * 1.05, 100))
    ax.legend(loc="upper right", fontsize=8, ncol=2)
    ax.grid(alpha=0.3, axis="y")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_aggregate_rotation(weights: pd.DataFrame, fund_names: dict, path: Path):
    """Average sector weights across the 8 funds, per quarter."""
    agg = weights.groupby(["quarter", "sector"], as_index=False)["weight"].mean()
    pivot = agg.pivot_table(index="quarter", columns="sector", values="weight", aggfunc="mean").fillna(0)
    pivot = pivot.reindex(_sort_quarters(pivot.index.tolist()))
    cols = [c for c in SECTOR_ORDER if c in pivot.columns and pivot[c].sum() > 0]
    pivot = pivot[cols]
    fig, ax = plt.subplots(figsize=(13, 6))
    for col in pivot.columns:
        ax.plot(pivot.index, pivot[col] * 100, marker="o", lw=2, label=col)
    ax.set_xticks(list(range(0, len(pivot.index), 4)) + [len(pivot.index) - 1])
    ax.set_xticklabels([pivot.index[i] for i in (list(range(0, len(pivot.index), 4)) + [len(pivot.index) - 1])],
                       rotation=45, fontsize=8)
    ax.set_title("Aggregate sector rotation — 8 superinvestor funds (avg top-20 weight)")
    ax.set_ylabel("Avg % of reported portfolio")
    ax.legend(loc="upper left", fontsize=8, ncol=2)
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_sector_heatmap(weights: pd.DataFrame, fund_names: dict, path: Path):
    """Heatmap: rows = funds, cols = sectors, value = latest-quarter weight."""
    latest_q = weights["quarter"].max()
    latest = weights[weights["quarter"] == latest_q]
    pivot = latest.pivot_table(index="fund", columns="sector", values="weight", aggfunc="sum").fillna(0)
    pivot.index = [fund_names.get(f, f) for f in pivot.index]
    cols = [c for c in SECTOR_ORDER if c in pivot.columns]
    pivot = pivot[cols]
    fig, ax = plt.subplots(figsize=(12, 6))
    im = ax.imshow(pivot.values * 100, aspect="auto", cmap="YlOrRd")
    ax.set_xticks(range(len(pivot.columns)))
    ax.set_xticklabels(pivot.columns, rotation=45, ha="right", fontsize=9)
    ax.set_yticks(range(len(pivot.index)))
    ax.set_yticklabels(pivot.index, fontsize=9)
    for i in range(pivot.shape[0]):
        for j in range(pivot.shape[1]):
            v = pivot.values[i, j] * 100
            if v > 0.5:
                ax.text(j, i, f"{v:.0f}", ha="center", va="center", fontsize=8,
                        color="white" if v > 40 else "black")
    plt.colorbar(im, ax=ax, label="% of reported portfolio")
    ax.set_title(f"Latest-quarter ({latest_q}) sector exposure by fund")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
