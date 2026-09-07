"""Drawdown analysis for any price series.

Provides the drawdown series, max drawdown, drawdown duration, and a list of
the deepest drawdowns (useful for the stress-test style "list the drawdowns"
view requested for the crypto cycle / stress-test style "list the drawdowns"
analysis).
"""

from __future__ import annotations

import pandas as pd
from backtest_engine import drawdown_series


def drawdown_summary(prices: pd.Series, top_n: int = 10) -> pd.DataFrame:
    """Return the `top_n` deepest drawdowns with peak/trough/recovery dates and durations."""
    equity = prices / prices.iloc[0]
    dd = drawdown_series(equity)
    # Identify distinct drawdown episodes (periods where dd < 0)
    in_dd = dd < -1e-8
    groups = (in_dd != in_dd.shift()).cumsum()
    episodes = []
    for _, g in dd[in_dd].groupby(groups):
        if g.empty:
            continue
        trough_date = g.idxmin()
        max_dd = float(g.min())
        peak_date = equity.loc[:trough_date].idxmax()
        recovery_mask = equity.loc[trough_date:] >= equity.loc[peak_date]
        if recovery_mask.any():
            recovery_date = recovery_mask[recovery_mask].index[0]
            recovery_duration = (recovery_date - peak_date).days
        else:
            recovery_date = pd.NaT
            recovery_duration = None
        episodes.append(
            {
                "peak_date": peak_date,
                "trough_date": trough_date,
                "recovery_date": recovery_date,
                "max_drawdown": max_dd,
                "peak_to_trough_days": (trough_date - peak_date).days,
                "recovery_days": recovery_duration,
            }
        )
    df = pd.DataFrame(episodes).sort_values("max_drawdown").head(top_n).reset_index(drop=True)
    return df


def rolling_max_drawdown(prices: pd.Series, window: int = 252) -> pd.Series:
    """Rolling max drawdown over a trailing window of `window` periods."""
    def _mdd(s: pd.Series) -> float:
        return float(drawdown_series(s).min())
    return prices.rolling(window).apply(_mdd, raw=False)
