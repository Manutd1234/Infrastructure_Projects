# NUSSIF Infrastructure Projects

A collection of self-contained data-and-research pipelines maintained by the
National University of Singapore Students' Investment Fund (NUSSIF). Each
project lives in its own folder, has its own `README.md`, `requirements.txt`,
and `main.py`, and can be run independently.

## Projects

| Folder | Project | Owner | What it does |
|---|---|---|---|
| [`CryptoBullCycle/`](CryptoBullCycle) | Crypto Bull Cycle | Ting Xuan | BTC bull/bear cycle identification, +3σ weekly breakout drift study, drawdown analysis, SPY benchmark, and a generic backtesting engine. |
| [`ThirteenFFilings/`](ThirteenFFilings) | 13F Filings | Siva | Dataroma scraper for 8 superinvestor funds, GICS sector classification, and sector-rotation charts across quarters. |
| [`CongressTrading/`](CongressTrading) | Congress Trading | Veon | House disclosure feasibility report, Capitol Trades scraper, sector rotation, consensus buy/sell, and committee-relevance signals. |

## Quickstart

Each project is independent. From inside a project folder:

```bash
pip install -r requirements.txt
python main.py
```

Outputs (CSV tables and PNG charts) are written to the project's `outputs/`
subfolder. Raw HTML/price caches are written to `cache/` so re-runs are fast
and polite to upstream data sources. Delete `cache/` to force a fresh pull.

## Repository layout

```
Infrastructure_Projects/
├── CryptoBullCycle/        # BTC cycle + breakout backtest + SPY benchmark
│   ├── backtest_engine.py
│   ├── data_loader.py
│   ├── cycle_analysis.py
│   ├── drawdowns.py
│   ├── breakout_backtest.py
│   ├── spy_benchmark.py
│   ├── main.py
│   └── outputs/            # generated CSVs + charts
├── ThirteenFFilings/       # Dataroma 13F scraper + sector rotation
│   ├── funds.py
│   ├── dataroma_scraper.py
│   ├── sector_classifier.py
│   ├── sector_rotation.py
│   ├── main.py
│   └── outputs/
├── CongressTrading/        # Capitol Trades scraper + consensus + committees
│   ├── house_disclosure_check.py
│   ├── capitol_trades_scraper.py
│   ├── sector_classifier.py
│   ├── consensus.py
│   ├── committee_signals.py
│   ├── sector_rotation.py
│   ├── main.py
│   └── outputs/
├── README.md              # this file
├── LICENSE
└── .gitignore
```

## Shared conventions

- **Data sources** are pulled live on first run and cached locally; subsequent
  runs read from cache. Delete the project's `cache/` folder to refresh.
- **Sectors** use GICS sector names throughout (Technology, Financials,
  Healthcare, Consumer Discretionary, Consumer Staples, Communication
  Services, Industrials, Energy, Materials, Real Estate, Utilities).
- **Backtesting** uses the generic engine in `CryptoBullCycle/backtest_engine.py`
  (CAGR, Sharpe, Sortino, Calmar, max drawdown, win rate) — reusable for any
  price-series strategy.
- **Python 3.10+** with `pandas`, `numpy`, `matplotlib`, `requests`,
  `beautifulsoup4`, `yfinance`, `scipy`.

See each project's `README.md` for methodology, results, and interpretation.
