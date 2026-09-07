"""Bull / bear market cycle identification for BTC.

A *bear market* is defined as a peak-to-trough decline of at least 20%
(the conventional threshold used for equities and widely applied to crypto).
A *bull market* is the trough-to-peak advance that precedes a bear market.

The module identifies all peaks and troughs in the price series, computes
the duration (days) and return of each cycle, and produces a summary
table that can be exported to CSV.
"""

from __future__ import annotations

import pandas as pd

BEAR_THRESHOLD = -0.20  # -20% peak-to-trough defines a bear market


def _peaks_and_troughs(prices: pd.Series, order: int = 5) -> list[tuple[str, pd.Timestamp, float]]:
    """Return alternating (label, date, price) tuples using a local-window argmax/argmin.

    `order` is the number of days on each side that must be lower (for a peak)
    or higher (for a trough). A small order captures mini-cycles; a larger
    order captures only major cycles. We use a moderate order and then keep
    only the bear markets that exceed the threshold.
    """
    vals = prices.values
    idx = prices.index
    points = []
    n = len(vals)
    for i in range(order, n - order):
        window = vals[i - order : i + order + 1]
        if vals[i] == window.max() and vals[i] > vals[i - 1]:
            points.append(("peak", idx[i], float(vals[i])))
        elif vals[i] == window.min() and vals[i] < vals[i - 1]:
            points.append(("trough", idx[i], float(vals[i])))
    # Collapse consecutive same-label points, keep alternating
    cleaned = []
    for p in points:
        if cleaned and cleaned[-1][0] == p[0]:
            # same label: keep the more extreme one
            if p[0] == "peak" and p[2] > cleaned[-1][2]:
                cleaned[-1] = p
            elif p[0] == "trough" and p[2] < cleaned[-1][2]:
                cleaned[-1] = p
        else:
            cleaned.append(p)
    return cleaned


def identify_cycles(prices: pd.Series, order: int = 10) -> pd.DataFrame:
    """Identify bull and bear cycles.

    Returns a DataFrame with columns:
        type, start_date, end_date, start_price, end_price, return, duration_days
    """
    pts = _peaks_and_troughs(prices, order=order)
    if not pts or pts[0][0] != "peak":
        # Ensure we start from a peak; if first is a trough, prepend the first price as peak
        pts.insert(0, ("peak", prices.index[0], float(prices.iloc[0])))
    rows = []
    for i in range(len(pts) - 1):
        label, d0, p0 = pts[i]
        _, d1, p1 = pts[i + 1]
        ret = p1 / p0 - 1.0
        kind = "bear" if label == "peak" else "bull"
        if kind == "bear" and ret > BEAR_THRESHOLD:
            # Not a deep enough decline to count as a bear market
            continue
        rows.append(
            {
                "type": kind,
                "start_date": d0,
                "end_date": d1,
                "start_price": p0,
                "end_price": p1,
                "return": ret,
                "duration_days": (d1 - d0).days,
            }
        )
    return pd.DataFrame(rows)


def bear_markets(prices: pd.Series, order: int = 10) -> pd.DataFrame:
    """Return only the bear market cycles."""
    cyc = identify_cycles(prices, order=order)
    return cyc[cyc["type"] == "bear"].reset_index(drop=True)


def bull_markets(prices: pd.Series, order: int = 10) -> pd.DataFrame:
    cyc = identify_cycles(prices, order=order)
    return cyc[cyc["type"] == "bull"].reset_index(drop=True)


def cycle_summary(prices: pd.Series, order: int = 10) -> dict:
    bears = bear_markets(prices, order=order)
    bulls = bull_markets(prices, order=order)
    return {
        "n_bear_markets": len(bears),
        "n_bull_markets": len(bulls),
        "avg_bear_duration_days": float(bears["duration_days"].mean()) if len(bears) else float("nan"),
        "avg_bull_duration_days": float(bulls["duration_days"].mean()) if len(bulls) else float("nan"),
        "avg_bear_return": float(bears["return"].mean()) if len(bears) else float("nan"),
        "avg_bull_return": float(bulls["return"].mean()) if len(bulls) else float("nan"),
        "max_bear_drawdown": float(bears["return"].min()) if len(bears) else float("nan"),
        "max_bull_return": float(bulls["return"].max()) if len(bulls) else float("nan"),
    }


if __name__ == "__main__":
    from data_loader import load_btc

    btc = load_btc()
    close = btc["Close"]
    bears = bear_markets(close)
    print("Bear markets (>=20% peak-to-trough):")
    print(bears.to_string(index=False))
    print()
    print("Cycle summary:", cycle_summary(close))
