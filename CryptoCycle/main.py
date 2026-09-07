"""Main runner for the Crypto Bull Cycle project.

Produces:
  outputs/cycles.csv             - bull/bear cycle table
  outputs/bear_markets.csv        - bear market list (date, drawdown, duration)
  outputs/breakout_study.csv      - forward-return drift table
  outputs/breakout_dates.csv      - list of breakout dates
  outputs/drawdowns.csv           - top drawdowns
  outputs/summary.json             - cycle summary stats
  outputs/cycles.png              - price chart with bull/bear shading
  outputs/breakout_forward.png    - forward return distributions
  outputs/drawdown.png            - BTC vs SPY drawdown
  outputs/equity_curve.png        - strategy vs buy-and-hold vs SPY
  outputs/correlation.png         - rolling BTC/SPY correlation
"""

from __future__ import annotations

import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
import pandas as pd

from data_loader import load_btc, load_spy
from cycle_analysis import identify_cycles, bear_markets, cycle_summary
from drawdowns import drawdown_summary
from breakout_backtest import breakout_drift_study, breakout_signals, FORWARD_HORIZONS
from spy_benchmark import comparison_report
from backtest_engine import buy_and_hold

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)


def _shade_cycles(ax, cycles: pd.DataFrame, prices: pd.Series):
    for _, row in cycles.iterrows():
        color = "red" if row["type"] == "bear" else "green"
        ax.axvspan(row["start_date"], row["end_date"], color=color, alpha=0.15)


def plot_cycles(prices: pd.Series, cycles: pd.DataFrame, path: Path):
    fig, ax = plt.subplots(figsize=(13, 6))
    ax.plot(prices.index, prices.values, color="black", lw=1.0, label="BTC close")
    _shade_cycles(ax, cycles, prices)
    ax.set_yscale("log")
    ax.set_title("BTC-USD with bull (green) / bear (red) market cycles")
    ax.set_ylabel("Price (USD, log scale)")
    ax.legend(loc="upper left")
    ax.xaxis.set_major_locator(mdates.YearLocator())
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_breakout_forward(study: dict, path: Path):
    fwd = study["forward_returns_table"]
    fig, ax = plt.subplots(figsize=(9, 5))
    x = range(len(FORWARD_HORIZONS))
    ax.bar([i - 0.2 for i in x], fwd["mean_breakout"], width=0.4, label="After breakout", color="steelblue")
    ax.bar([i + 0.2 for i in x], fwd["mean_all"], width=0.4, label="All dates (baseline)", color="lightgray")
    ax.set_xticks(list(x))
    ax.set_xticklabels([f"{h}d" for h in FORWARD_HORIZONS])
    ax.axhline(0, color="black", lw=0.8)
    ax.set_title("Forward returns after +3σ weekly breakout vs. baseline")
    ax.set_ylabel("Mean forward return")
    ax.legend()
    ax.grid(alpha=0.3, axis="y")
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_drawdown(btc_dd: pd.Series, spy_dd: pd.Series, path: Path):
    fig, ax = plt.subplots(figsize=(13, 5))
    ax.plot(btc_dd.index, btc_dd.values * 100, label="BTC", color="orange")
    ax.plot(spy_dd.index, spy_dd.values * 100, label="SPY", color="steelblue")
    ax.fill_between(btc_dd.index, btc_dd.values * 100, 0, color="orange", alpha=0.2)
    ax.set_title("Drawdown comparison: BTC vs SPY")
    ax.set_ylabel("Drawdown (%)")
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_equity(strategy_eq: pd.Series, btc_eq: pd.Series, spy_eq: pd.Series, path: Path):
    fig, ax = plt.subplots(figsize=(13, 6))
    ax.plot(strategy_eq.index, strategy_eq.values, label="Breakout strategy", color="purple")
    ax.plot(btc_eq.index, btc_eq.values, label="BTC buy & hold", color="orange")
    ax.plot(spy_eq.index, spy_eq.values, label="SPY buy & hold", color="steelblue")
    ax.set_yscale("log")
    ax.set_title("Equity curves (log scale, $1 start)")
    ax.set_ylabel("Equity")
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def plot_correlation(rolling_corr: pd.Series, path: Path):
    fig, ax = plt.subplots(figsize=(13, 4))
    ax.plot(rolling_corr.index, rolling_corr.values, color="teal")
    ax.axhline(0, color="black", lw=0.5)
    ax.set_title("90-day rolling correlation: BTC vs SPY")
    ax.set_ylabel("Correlation")
    ax.set_ylim(-0.5, 1.0)
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(path, dpi=120)
    plt.close(fig)


def main():
    print("Loading BTC and SPY data ...")
    btc = load_btc()
    spy = load_spy()
    close = btc["Close"]

    print("Identifying bull/bear cycles ...")
    # order=45 captures major cycles (smooths out <2-month noise)
    cycles = identify_cycles(close, order=45)
    cycles.to_csv(OUT / "cycles.csv", index=False)
    bears = bear_markets(close, order=45)
    bears.to_csv(OUT / "bear_markets.csv", index=False)
    summary = cycle_summary(close, order=45)
    with open(OUT / "summary.json", "w") as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"  Found {len(bears)} bear markets, {len(cycles)} total cycles")
    print(f"  Avg bear duration: {summary['avg_bear_duration_days']:.0f} days")
    print(f"  Avg bull duration: {summary['avg_bull_duration_days']:.0f} days")

    print("Computing drawdowns ...")
    dd_top = drawdown_summary(close, top_n=15)
    dd_top.to_csv(OUT / "drawdowns.csv", index=False)
    print(dd_top.to_string(index=False))

    print("Running breakout drift study ...")
    study = breakout_drift_study(close)
    study["forward_returns_table"].to_csv(OUT / "breakout_study.csv", index=False)
    pd.Series(study["breakout_dates"]).to_csv(OUT / "breakout_dates.csv", index=False, header=["signal_date"])
    print(study["forward_returns_table"].to_string(index=False))
    print(f"  Total breakouts: {study['n_breakouts_total']}")

    print("SPY benchmark comparison ...")
    rep = comparison_report(close, spy["Close"])
    print(f"  BTC/SPY correlation: {rep['correlation']:.3f}")
    print(f"  BTC CAGR {rep['btc_cagr']:.2%} / MaxDD {rep['btc_max_drawdown']:.2%}")
    print(f"  SPY CAGR {rep['spy_cagr']:.2%} / MaxDD {rep['spy_max_drawdown']:.2%}")

    print("Strategy vs buy & hold ...")
    strat = study["strategy_result"]
    bh = study["buy_hold_result"]
    spy_bh = buy_and_hold(spy["Close"], periods_per_year=252)
    metric_map = {
        "Total Return": "total_return",
        "CAGR": "cagr",
        "Volatility (ann.)": "volatility_ann",
        "Sharpe": "sharpe",
        "Sortino": "sortino",
        "Max Drawdown": "max_drawdown",
        "Drawdown Trough": "drawdown_trough",
        "Drawdown Recovery": "drawdown_recovery",
        "Win Rate": "win_rate",
        "Win Rate (invested)": "win_rate_invested",
        "Num Trades": "num_trades",
        "Final Equity": "final_equity",
    }
    perf_rows = []
    for name, result in (
        ("Breakout Strategy", strat),
        ("BTC Buy&Hold", bh),
        ("SPY Buy&Hold", spy_bh),
    ):
        row = {"strategy": name}
        for label, col in metric_map.items():
            row[col] = result.metrics.get(label)
        perf_rows.append(row)
    pd.DataFrame(perf_rows).to_csv(OUT / "performance.csv", index=False)
    print("  Strategy:", strat.metrics)
    print("  BTC B&H :", bh.metrics)

    print("Generating charts ...")
    plot_cycles(close, cycles, OUT / "cycles.png")
    plot_breakout_forward(study, OUT / "breakout_forward.png")
    plot_drawdown(rep["btc_drawdown_series"], rep["spy_drawdown_series"], OUT / "drawdown.png")
    plot_equity(strat.equity, bh.equity, spy_bh.equity, OUT / "equity_curve.png")
    plot_correlation(rep["rolling_corr_90d"], OUT / "correlation.png")

    print(f"\nAll outputs written to {OUT}")


if __name__ == "__main__":
    main()
