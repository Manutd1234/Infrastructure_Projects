"""Consensus buy/sell analysis for congress trades.

Consensus signals:
  - Per-ticker consensus: net buy/sell count and net dollar volume
    (using the midpoint of the disclosed size range).
  - Per-ticker-month consensus: rolling net to track sentiment over time.
  - Overall consensus: share of buys vs sells by month.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def _signed_size(row: pd.Series) -> float:
    """Midpoint of the disclosed size range, signed by trade direction."""
    mid = (row["size_low_usd"] + row["size_high_usd"]) / 2.0
    if np.isnan(mid):
        mid = row["size_low_usd"]
    if np.isnan(mid):
        return 0.0
    sign = 1.0 if str(row["trade_type"]).lower().startswith("buy") else -1.0
    return sign * mid


def add_signed_size(trades: pd.DataFrame) -> pd.DataFrame:
    out = trades.copy()
    out["signed_size_usd"] = out.apply(_signed_size, axis=1)
    return out


def ticker_consensus(trades: pd.DataFrame) -> pd.DataFrame:
    """One row per ticker: net count, net USD, buy %, n politicians."""
    df = add_signed_size(trades)
    df = df[df["ticker"].notna() & (df["ticker"] != "")]
    g = df.groupby("ticker")
    out = pd.DataFrame({
        "n_trades": g.size(),
        "n_buy": g["trade_type"].apply(lambda s: (s.str.startswith("buy", na=False)).sum()),
        "n_sell": g["trade_type"].apply(lambda s: (s.str.startswith("sell", na=False)).sum()),
        "net_signed_usd": g["signed_size_usd"].sum(),
        "n_politicians": g["politician_id"].nunique(),
        "issuer": g["issuer"].first(),
        "sector": g["sector"].first() if "sector" in df.columns else None,
    }).reset_index()
    out["buy_pct"] = out["n_buy"] / (out["n_buy"] + out["n_sell"]).replace(0, np.nan)
    out["consensus"] = np.where(out["net_signed_usd"] > 0, "BUY",
                        np.where(out["net_signed_usd"] < 0, "SELL", "NEUTRAL"))
    return out.sort_values("net_signed_usd", ascending=False).reset_index(drop=True)


def monthly_consensus(trades: pd.DataFrame) -> pd.DataFrame:
    """Net signed USD and buy/sell counts by month."""
    df = add_signed_size(trades)
    df = df[df["traded"].notna()].copy()
    df["month"] = pd.to_datetime(df["traded"]).dt.to_period("M").astype(str)
    g = df.groupby("month")
    out = pd.DataFrame({
        "n_trades": g.size(),
        "n_buy": g["trade_type"].apply(lambda s: (s.str.startswith("buy", na=False)).sum()),
        "n_sell": g["trade_type"].apply(lambda s: (s.str.startswith("sell", na=False)).sum()),
        "net_signed_usd": g["signed_size_usd"].sum(),
    }).reset_index().sort_values("month")
    out["buy_share"] = out["n_buy"] / (out["n_buy"] + out["n_sell"]).replace(0, np.nan)
    return out
