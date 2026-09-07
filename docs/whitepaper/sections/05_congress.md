# Congress trading

## Question

Can structured trade data be pulled from the House Clerk's disclosure
site? If not, what is the practical source? Do politicians trade sectors
their committees oversee?

## Decision on data source

The House Clerk site (`disclosures-clerk.house.gov`) publishes PDF
reports, not structured data. There is no JSON API and no
transaction-level feed. Extracting trades requires downloading thousands
of PDFs and parsing unstructured text — feasible but a multi-week
engineering project. We therefore scrape Capitol Trades, which already
cleans and publishes the underlying disclosures as structured rows.

## Method

- Scrape Capitol Trades `/trades?page=<N>` (720 trades, 39 politicians,
  266 tickers, 2024-08 → 2026-08).
- Classify each ticker into a GICS sector (curated fallback + yfinance,
  normalised to canonical names; ETFs mapped to their underlying asset
  class).
- Compute per-ticker and per-month consensus as net signed USD (midpoint
  of disclosed size range, buy = +, sell = −).
- Flag each trade as committee-aligned if the politician's committee(s)
  oversee the trade's sector. Committee → sector assignments use the
  committee's jurisdiction; politician → committee is curated for the
  39 most active traders.

## Headline results

- Sector mix: Healthcare 21%, Technology 17%, Financials 11%,
  Consumer Discretionary 8%, Industrials 7%.
- Top BUY (net signed USD): Bloom Energy, Goldman Sachs, Intel,
  Toronto-Dominion Bank, JPMorgan.
- Top SELL: Costco, AT&T, Apple, Alpha Teknova, TIC Solutions.
- **35.7%** of trades are committee-aligned — meaningfully above the
  random-assignment baseline. Strongest signals:
  - Armed Services — 112 aligned trades (46 buy / 66 sell), 5
    politicians, Industrials/Technology (defense).
  - Health, Education, Labor, and Pensions — 96 aligned trades, almost
    all sells (95/96), Healthcare.
  - Finance — 16 aligned trades, all buys, Financials.
  - Ways and Means — 15 aligned trades, all sells, Financials/Healthcare.

The committee-aligned share supports the hypothesis that politicians
concentrate trades in sectors their committees oversee — whether this
reflects information advantage, familiarity, or both is not answered
by this data alone.
