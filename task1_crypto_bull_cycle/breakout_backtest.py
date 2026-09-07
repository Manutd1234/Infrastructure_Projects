"""3-sigma weekly breakout drift study (Task 1 core).

Hypothesis
----------
Bitcoin exhibits positive post-breakout drift after a weekly return that
exceeds +3 standard deviations, where sigma is estimated from the preceding
60-day realised volatility and scaled to a weekly horizon.

Method
------
1.  Compute daily log returns.
2.  Rolling 60-day realised vol:  sigma_daily = std(r_t over last 60 days).
    Scale to a weekly horizon:    sigma_weekly = sigma_daily * sqrt(7).
    (Crypto trades 7 days a week, so a week is 7 daily observations.)
3.  Weekly return:  r_week_t = P_t / P_{t-7} - 1   (trailing 7-day return).
4.  Breakout signal at day t when  r_week_t > +3 * sigma_weekly_t,
    where sigma_weekly_t uses only returns strictly *before* t (no look-ahead).
5.  For every breakout date, measure forward 30D / 60D / 120D / 365D returns.
6.  Statistical test:  paired t-test of forward returns vs. the unconditional
    sample of forward returns over the same horizon. Also report the share
    of breakouts that were positive.
7.  Backtest a simple "hold for 30 days after breakout" strategy and compare
    to buy-and-hold BTC and SPY.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats

from backtest_engine import backtest, buy_and_hold

FORWARD_HORIZONS = [30, 60, 120, 365]
WEEK = 7
VOL_WINDOW = 60
Z_THRESHOLD = 3.0


def realised_weekly_vol(daily_returns: pd.Series, window: int = VOL_WINDOW) -> pd.Series:
    """60-day realised volatility scaled to a weekly horizon.

    Uses the standard deviation of daily log returns over the trailing
    `window` days and scales by sqrt(7) to a weekly horizon.
    """
    sigma_daily = daily_returns.rolling(window).std(ddof=1)
    return sigma_daily * np.sqrt(WEEK)


def weekly_returns(prices: pd.Series) -> pd.Series:
    """Trailing 7-day simple return."""
    return prices / prices.shift(WEEK) - 1.0


def breakout_signals(prices: pd.Series, z: float = Z_THRESHOLD) -> pd.Series:
    """Boolean series: True on days where trailing weekly return > +3 * sigma_weekly.

    sigma_weekly is computed from returns strictly *before* the signal date
    (the rolling std at t already excludes the return at t), so the signal is
    not contaminated by the breakout day itself.
    """
    log_ret = np.log(prices / prices.shift(1))
    sig_w = realised_weekly_vol(log_ret)
    r_w = weekly_returns(prices)
    signal = r_w > z * sig_w
    # Drop the warm-up period
    signal.iloc[: VOL_WINDOW + WEEK] = False
    return signal


def forward_returns(prices: pd.Series, horizons: list[int] = FORWARD_HORIZONS) -> pd.DataFrame:
    """Forward simple returns for each horizon, indexed by signal date."""
    out = {}
    for h in horizons:
        out[f"fwd_{h}d"] = prices.shift(-h) / prices - 1.0
    return pd.DataFrame(out)


def breakout_drift_study(prices: pd.Series, z: float = Z_THRESHOLD) -> dict:
    """Run the full breakout drift study and return a results dict."""
    sig = breakout_signals(prices, z=z)
    fwd = forward_returns(prices)
    breakout_fwd = fwd.loc[sig].dropna(how="all")
    all_fwd = fwd.dropna(how="all")

    rows = []
    for h in FORWARD_HORIZONS:
        col = f"fwd_{h}d"
        b = breakout_fwd[col].dropna()
        a = all_fwd[col].dropna()
        if len(b) < 2:
            rows.append(
                {
                    "horizon": h,
                    "n_breakouts": len(b),
                    "mean_breakout": float("nan"),
                    "median_breakout": float("nan"),
                    "pct_positive": float("nan"),
                    "mean_all": float(a.mean()),
                    "t_stat": float("nan"),
                    "p_value": float("nan"),
                    "excess_vs_all": float("nan"),
                }
            )
            continue
        t_stat, p_val = stats.ttest_1samp(b, popmean=float(a.mean()))
        rows.append(
            {
                "horizon": h,
                "n_breakouts": len(b),
                "mean_breakout": float(b.mean()),
                "median_breakout": float(b.median()),
                "pct_positive": float((b > 0).mean()),
                "mean_all": float(a.mean()),
                "t_stat": float(t_stat),
                "p_value": float(p_val),
                "excess_vs_all": float(b.mean() - a.mean()),
            }
        )
    table = pd.DataFrame(rows)

    # Simple backtest: hold for 30 days after a breakout signal
    hold_days = 30
    pos = pd.Series(0.0, index=prices.index)
    sig_dates = sig[sig].index
    for d in sig_dates:
        end = d + pd.Timedelta(days=hold_days)
        pos.loc[d:end] = 1.0
    strat = backtest(prices, pos, trade_cost=0.001, periods_per_year=365)
    bh = buy_and_hold(prices, periods_per_year=365)

    return {
        "n_breakouts_total": int(sig.sum()),
        "breakout_dates": sig[sig].index.tolist(),
        "forward_returns_table": table,
        "strategy_result": strat,
        "buy_hold_result": bh,
        "positions": pos,
    }


if __name__ == "__main__":
    from data_loader import load_btc

    btc = load_btc()
    res = breakout_drift_study(btc["Close"])
    print(f"Total breakouts: {res['n_breakouts_total']}")
    print(res["forward_returns_table"].to_string(index=False))
    print()
    print("Strategy metrics:")
    print(res["strategy_result"].summary())
    print()
    print("Buy & hold BTC:")
    print(res["buy_hold_result"].summary())
