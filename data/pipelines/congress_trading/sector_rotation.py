"""Sector rotation analysis for congress trades.

Aggregates trades by sector and month/quarter to show how congress's
sector exposure changes over time, weighted by trade size (midpoint of
disclosed range).
"""

from __future__ import annotations

from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)

SECTOR_ORDER = [
    "Technology", "Communication Services", "Financials", "Healthcare",
    "Consumer Discretionary", "Consumer Staples", "Industrials", "Energy",
    "Materials", "Real Estate", "Utilities", "Unknown",
]


def _midpoint_size(trades: pd.DataFrame) -> pd.DataFrame:
    out = trades.copy()
    out["size_mid_usd"] = (out["size_low_usd"] + out["size_high_usd"]) / 2.0
    out["size_mid_usd"] = out["size_mid_usd"].fillna(out["size_low_usd"])
    return out


def sector_monthly_weights(trades: pd.DataFrame) -> pd.DataFrame:
    """Sum of trade size by sector per month, normalised to % of monthly volume."""
    df = _midpoint_size(trades)
    df = df[df["traded"].notna() & df["sector"].notna()].copy()
    df["month"] = pd.to_datetime(df["traded"]).dt.to_period("M").astype(str)
    g = df.groupby(["month", "sector"], as_index=False)["size_mid_usd"].sum()
    g["weight"] = g.groupby("month")["size_mid_usd"].transform(lambda s: s / s.sum() if s.sum() else 0)
    return g


def plot_sector_rotation(trades: pd.DataFrame, path: Path):
    w = sector_monthly_weights(trades)
    if w.empty:
        return
    pivot = w.pivot_table(index="month", columns="sector", values="weight", aggfunc="sum").fillna(0)
    pivot = pivot.sort_index()
    cols = [c for c in SECTOR_ORDER if c in pivot.columns and pivot[c].sum() > 0]
    pivot = pivot[cols]
    fig, ax = plt.subplots(figsize=(13, 6))
    x = range(len(pivot))
    bottom = np.zeros(len(pivot))
    for col in pivot.columns:
        vals = pivot[col].values * 100
        ax.bar(x, vals, bottom=bottom, label=col, width=0.85)
        bottom += vals
    ax.set_xticks(list(x))
    ax.set_xticklabels(pivot.index, rotation=90, fontsize=8)
    ax.set_title("Congress sector rotation — share of monthly trade volume by sector")
    ax.set_ylabel("% of monthly trade volume")
    ax.set_ylim(0, max(bottom.max() * 1.05, 100))
    ax.legend(loc="upper right", fontsize=8, ncol=2)
    ax.grid(alpha=0.3, axis="y")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_party_sector(trades: pd.DataFrame, path: Path):
    """Grouped bar: average sector weight by party."""
    w = sector_monthly_weights(trades)
    if w.empty or "party" not in trades.columns:
        return
    df = _midpoint_size(trades)
    df = df[df["traded"].notna() & df["sector"].notna() & df["party"].notna()].copy()
    g = df.groupby(["party", "sector"], as_index=False)["size_mid_usd"].sum()
    g["weight"] = g.groupby("party")["size_mid_usd"].transform(lambda s: s / s.sum() if s.sum() else 0)
    pivot = g.pivot_table(index="party", columns="sector", values="weight", aggfunc="sum").fillna(0)
    cols = [c for c in SECTOR_ORDER if c in pivot.columns and pivot[c].sum() > 0]
    pivot = pivot[cols]
    fig, ax = plt.subplots(figsize=(13, 6))
    x = np.arange(len(pivot.columns))
    width = 0.4
    parties = list(pivot.index)
    for i, p in enumerate(parties):
        ax.bar(x + (i - 0.5) * width, pivot.loc[p].values * 100, width=width, label=p)
    ax.set_xticks(list(x))
    ax.set_xticklabels(pivot.columns, rotation=30, ha="right", fontsize=9)
    ax.set_title("Sector exposure by party (share of trade volume)")
    ax.set_ylabel("% of party trade volume")
    ax.legend()
    ax.grid(alpha=0.3, axis="y")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_committee_alignment(trades: pd.DataFrame, path: Path):
    """Bar chart: aligned vs non-aligned trade count by sector."""
    if "committee_aligned" not in trades.columns:
        return
    df = trades[trades["sector"].notna()].copy()
    g = df.groupby(["sector", "committee_aligned"], as_index=False).size()
    pivot = g.pivot_table(index="sector", columns="committee_aligned", values="size", aggfunc="sum").fillna(0)
    if True not in pivot.columns:
        pivot[True] = 0
    if False not in pivot.columns:
        pivot[False] = 0
    pivot = pivot.reindex([s for s in SECTOR_ORDER if s in pivot.index])
    fig, ax = plt.subplots(figsize=(12, 6))
    x = np.arange(len(pivot))
    width = 0.4
    ax.bar(x - width/2, pivot[False].values, width=width, label="Not committee-aligned", color="lightgray")
    ax.bar(x + width/2, pivot[True].values, width=width, label="Committee-aligned", color="steelblue")
    ax.set_xticks(list(x))
    ax.set_xticklabels(pivot.index, rotation=30, ha="right", fontsize=9)
    ax.set_title("Committee-aligned vs non-aligned trades by sector")
    ax.set_ylabel("Number of trades")
    ax.legend()
    ax.grid(alpha=0.3, axis="y")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)
