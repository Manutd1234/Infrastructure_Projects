"""Generic backtesting engine for price-series strategies.

This module is strategy-agnostic: feed it a price series and a signal/position
generator, and it produces an equity curve plus a full performance report
(CAGR, Sharpe, Sortino, Calmar, max drawdown, drawdown duration, win rate).

It is reused by the crypto breakout study and can be reused for
any of the other infrastructure projects.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Optional

import numpy as np
import pandas as pd


TRADING_DAYS_PER_YEAR = 365  # crypto trades every day; use 252 for equities


@dataclass
class BacktestResult:
    """Container for backtest output and metrics."""

    equity: pd.Series
    returns: pd.Series
    positions: pd.Series
    drawdown: pd.Series
    metrics: dict = field(default_factory=dict)

    def summary(self) -> pd.DataFrame:
        return pd.Series(self.metrics).to_frame("value")


def _safe_sharpe(returns: pd.Series, rf: float = 0.0, periods: int = TRADING_DAYS_PER_YEAR) -> float:
    if returns.empty:
        return float("nan")
    excess = returns - rf / periods
    std = excess.std(ddof=1)
    if std == 0 or np.isnan(std):
        return float("nan")
    return float(np.sqrt(periods) * excess.mean() / std)


def _safe_sortino(returns: pd.Series, rf: float = 0.0, periods: int = TRADING_DAYS_PER_YEAR) -> float:
    if returns.empty:
        return float("nan")
    excess = returns - rf / periods
    downside = excess[excess < 0]
    if downside.empty:
        return float("inf")
    dd_std = downside.std(ddof=1)
    if dd_std == 0 or np.isnan(dd_std):
        return float("nan")
    return float(np.sqrt(periods) * excess.mean() / dd_std)


def drawdown_series(equity: pd.Series) -> pd.Series:
    """Return the drawdown series as negative percentages (0 = no drawdown)."""
    peak = equity.cummax()
    dd = (equity - peak) / peak
    return dd


def max_drawdown(equity: pd.Series) -> tuple[float, pd.Timestamp, pd.Timestamp]:
    """Return (max_dd_pct, trough_date, recovery_date_or_NaT)."""
    dd = drawdown_series(equity)
    trough_idx = dd.idxmin()
    max_dd = float(dd.min())
    peak_idx = equity.loc[:trough_idx].idxmax()
    recovery_mask = (equity.loc[trough_idx:] >= equity.loc[peak_idx])
    if recovery_mask.any():
        recovery_idx = recovery_mask[recovery_mask].index[0]
    else:
        recovery_idx = pd.NaT
    return max_dd, trough_idx, recovery_idx


def backtest(
    prices: pd.Series,
    positions: pd.Series,
    trade_cost: float = 0.0,
    periods_per_year: int = TRADING_DAYS_PER_YEAR,
    rf: float = 0.0,
) -> BacktestResult:
    """Run a long-only backtest.

    Parameters
    ----------
    prices : pd.Series
        Close prices indexed by date.
    positions : pd.Series
        Target fractional position (1.0 = fully invested, 0.0 = flat) at the
        *start* of each period. Position for day t is applied to the return
        realised from t to t+1 (no look-ahead).
    trade_cost : float
        Proportional cost per unit turnover (e.g. 0.001 = 10 bps).
    periods_per_year : int
        365 for crypto (daily), 252 for equities.
    rf : float
        Annualised risk-free rate for Sharpe/Sortino.
    """
    prices = prices.dropna()
    positions = positions.reindex(prices.index).ffill().fillna(0.0)
    positions = positions.clip(lower=0.0)

    simple_returns = prices.pct_change()
    # Apply position decided at start of period to return earned over that period.
    # Shift position by one so we use yesterday's signal for today's return.
    aligned_pos = positions.shift(1).fillna(0.0)
    turnover = aligned_pos.diff().abs().fillna(aligned_pos.abs())
    net_returns = aligned_pos * simple_returns - trade_cost * turnover
    equity = (1.0 + net_returns).cumprod()

    dd = drawdown_series(equity)
    mdd, trough, recovery = max_drawdown(equity)

    n_years = len(equity) / periods_per_year
    cagr = float(equity.iloc[-1] ** (1.0 / n_years) - 1.0) if n_years > 0 and equity.iloc[-1] > 0 else float("nan")
    vol = float(net_returns.std(ddof=1) * np.sqrt(periods_per_year))

    win_rate = float((net_returns > 0).mean()) if len(net_returns) else float("nan")
    invested = net_returns[aligned_pos > 0]
    win_rate_invested = float((invested > 0).mean()) if len(invested) else float("nan")
    n_trades = int((aligned_pos.diff().abs() > 0).sum())

    metrics = {
        "Total Return": float(equity.iloc[-1] - 1.0),
        "CAGR": cagr,
        "Volatility (ann.)": vol,
        "Sharpe": _safe_sharpe(net_returns, rf, periods_per_year),
        "Sortino": _safe_sortino(net_returns, rf, periods_per_year),
        "Max Drawdown": mdd,
        "Drawdown Trough": str(trough.date()) if not pd.isna(trough) else "n/a",
        "Drawdown Recovery": str(recovery.date()) if not pd.isna(recovery) else "not recovered",
        "Win Rate": win_rate,
        "Win Rate (invested)": win_rate_invested,
        "Num Trades": n_trades,
        "Final Equity": float(equity.iloc[-1]),
    }
    return BacktestResult(equity=equity, returns=net_returns, positions=aligned_pos, drawdown=dd, metrics=metrics)


def buy_and_hold(prices: pd.Series, periods_per_year: int = TRADING_DAYS_PER_YEAR) -> BacktestResult:
    """Benchmark: always fully invested."""
    pos = pd.Series(1.0, index=prices.index)
    return backtest(prices, pos, trade_cost=0.0, periods_per_year=periods_per_year)
