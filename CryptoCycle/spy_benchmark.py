"""SPY benchmark comparison.

Compares BTC (and the breakout strategy) against SPY as the equity benchmark.
Reports correlation, relative drawdowns, and rolling beta.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from backtest_engine import drawdown_series, max_drawdown


def align_close(btc: pd.DataFrame, spy: pd.DataFrame) -> pd.DataFrame:
    """Inner-join BTC and SPY closes on common trading dates."""
    df = pd.DataFrame({"BTC": btc["Close"], "SPY": spy["Close"]}).dropna()
    return df


def comparison_report(btc_close: pd.Series, spy_close: pd.Series) -> dict:
    btc_ret = btc_close.pct_change().dropna()
    spy_ret = spy_close.pct_change().dropna()
    common = pd.concat([btc_ret, spy_ret], axis=1, keys=["BTC", "SPY"]).dropna()
    corr = common["BTC"].corr(common["SPY"])
    rolling_corr = common["BTC"].rolling(90).corr(common["SPY"])

    btc_eq = btc_close / btc_close.iloc[0]
    spy_eq = spy_close / spy_close.iloc[0]
    btc_dd = drawdown_series(btc_eq)
    spy_dd = drawdown_series(spy_eq)
    btc_mdd, btc_trough, _ = max_drawdown(btc_eq)
    spy_mdd, spy_trough, _ = max_drawdown(spy_eq)

    n = len(btc_close)
    btc_cagr = float((btc_close.iloc[-1] / btc_close.iloc[0]) ** (365.0 / n) - 1.0) if n > 1 else float("nan")
    spy_n = len(spy_close)
    spy_cagr = float((spy_close.iloc[-1] / spy_close.iloc[0]) ** (252.0 / spy_n) - 1.0) if spy_n > 1 else float("nan")

    return {
        "correlation": float(corr),
        "rolling_corr_90d": rolling_corr,
        "btc_cagr": btc_cagr,
        "spy_cagr": spy_cagr,
        "btc_max_drawdown": btc_mdd,
        "spy_max_drawdown": spy_mdd,
        "btc_drawdown_series": btc_dd,
        "spy_drawdown_series": spy_dd,
        "btc_trough_date": str(btc_trough.date()),
        "spy_trough_date": str(spy_trough.date()),
        "btc_returns": btc_ret,
        "spy_returns": spy_ret,
    }


if __name__ == "__main__":
    from data_loader import load_btc, load_spy

    btc = load_btc()
    spy = load_spy()
    rep = comparison_report(btc["Close"], spy["Close"])
    print(f"Correlation: {rep['correlation']:.3f}")
    print(f"BTC CAGR: {rep['btc_cagr']:.2%}  MaxDD: {rep['btc_max_drawdown']:.2%}")
    print(f"SPY CAGR: {rep['spy_cagr']:.2%}  MaxDD: {rep['spy_max_drawdown']:.2%}")
