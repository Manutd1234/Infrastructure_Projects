# Congress Trading Report

**Goal:** Assess whether structured trade data can be pulled from the House Clerk's disclosure site; if not, scrape Capitol Trades. Then build: a sector-rotation view, a consensus buy/sell signal, and a committee-relevance signal (e.g. Armed Services → defense, Energy → energy).

## Decision on data source

The House Clerk site (`disclosures-clerk.house.gov`) publishes **PDF reports**, not structured data. There is no JSON API and no transaction-level feed. Extracting trades would require downloading thousands of PDFs and parsing unstructured text — feasible but a multi-week engineering project. See `outputs/house_disclosure_feasibility.md` for the full probe and reasoning.

We therefore scrape **Capitol Trades** (`https://www.capitoltrades.com/trades`), which already cleans and publishes the underlying House/Senate disclosures as structured rows.

## What this folder does

| File | Purpose |
|---|---|
| `house_disclosure_check.py` | Probes the House Clerk site, summarises what is/isn't available, writes a markdown feasibility report. |
| `capitol_trades_scraper.py` | Scrapes `/trades?page=<N>`, parses the server-rendered HTML table into a tidy DataFrame (politician, party, chamber, state, issuer, ticker, published/traded dates, owner, buy/sell, size range, price). Caches to `cache/trades.csv`. |
| `sector_classifier.py` | Maps each ticker (e.g. `AAPL:US`) to a GICS sector via a curated fallback (incl. common ETFs) + yfinance. Caches to `cache/sectors.csv`. |
| `consensus.py` | Per-ticker and per-month consensus: net buy/sell count and net signed USD (midpoint of disclosed size range). |
| `committee_signals.py` | `COMMITTEE_SECTORS` (committee → GICS sectors it oversees) and `POLITICIAN_COMMITTEES` (politician_id → committees, curated for the 39 most active congress traders). Flags each trade as committee-aligned or not. |
| `sector_rotation.py` | Plots: sector rotation over time, sector exposure by party, committee-aligned vs non-aligned by sector. |
| `main.py` | Runs the full pipeline and writes outputs. |

## How to run

```bash
pip install -r requirements.txt
python main.py
```

The first run scrapes 60 pages (~720 trades) and fetches sectors from yfinance for unknown tickers (~3 minutes). Subsequent runs use the cache and finish in seconds. Delete `cache/` to force a fresh scrape.

## Method notes

- **Trade size**: Capitol Trades discloses a range (e.g. `1K–15K`). We use the midpoint as the trade USD value for weighting; consensus uses the signed midpoint (buy = +, sell = −).
- **Sectors**: GICS sectors via yfinance, normalised to canonical names. ETFs are mapped to their underlying asset class (e.g. `XLE` → Energy, `XLK` → Technology, broad-market ETFs → Financials). ~21% of trades remain "Unknown" sector (mostly obscure small-caps yfinance can't resolve).
- **Committee relevance**: A trade is *committee-aligned* if the politician's committee(s) oversee the trade's GICS sector. The mapping is curated for the 39 politicians that appear in the scraped sample; extend `POLITICIAN_COMMITTEES` to broaden coverage. Committee → sector assignments use the committee's jurisdiction (Armed Services → Industrials/Technology, Energy & Commerce → Energy/Healthcare/Utilities, Financial Services → Financials/Real Estate, etc.).

## Outputs (`outputs/`)

- `house_disclosure_feasibility.md` — feasibility report for the House Clerk site.
- `trades_raw.csv` — tidy trades table (720 rows, 39 politicians, 266 tickers, 2024-08-20 → 2026-08-28).
- `trades_with_sectors.csv` — same, with `sector` and committee-alignment columns.
- `ticker_consensus.csv` — per-ticker consensus (n_buy, n_sell, net_signed_usd, consensus flag).
- `monthly_consensus.csv` — net signed USD and buy/sell counts by month.
- `committee_summary.csv` — per-committee aligned trade volume and buy/sell breakdown.
- `sector_rotation.png` — stacked bar of monthly trade volume by sector.
- `party_sector.png` — sector exposure by party (Democrat vs Republican).
- `committee_alignment.png` — committee-aligned vs non-aligned trades by sector.

## Key observations (720 trades, 2024-08 → 2026-08)

- **Sector mix:** Healthcare 21%, Technology 17%, Financials 11%, Consumer Discretionary 8%, Industrials 7%, Consumer Staples 5%. The Healthcare tilt is driven by a small number of politicians trading biotech/pharma names.
- **Consensus (top BUY by net signed USD):** Bloom Energy (BE), Goldman Sachs (GS), Intel (INTC), Toronto-Dominion Bank (TD), JPMorgan (JPM). **Top SELL:** Costco (COST), AT&T (T), Apple (AAPL), Alpha Teknova (TKNO), TIC Solutions.
- **Committee relevance:** 257 of 720 trades (35.7%) are committee-aligned — i.e. the politician's committee oversees the sector they traded. The strongest signals:
  - **Armed Services** — 112 aligned trades (46 buy / 66 sell), 5 politicians trading Industrials/Technology (defense names).
  - **Health, Education, Labor, and Pensions (HELP)** — 96 aligned trades, almost all sells (95/96), 2 politicians selling Healthcare names.
  - **Oversight and Accountability** — 69 aligned trades (37 buy / 32 sell), Technology names.
  - **Finance** — 16 aligned trades, all buys, 1 politician buying Financials.
  - **Ways and Means** — 15 aligned trades, all sells, Financials/Healthcare.

The committee-aligned share (35.7%) is meaningfully above what you'd expect from random sector assignment, which supports the hypothesis that politicians concentrate trades in sectors their committees oversee — though whether this reflects information advantage, familiarity, or both is not answered by this data alone.
