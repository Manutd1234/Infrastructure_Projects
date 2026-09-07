# 13F filings — sector rotation

## Question

How do superinvestors rotate sectors across quarters, and where are they
concentrated today?

## Method

- Scrape Dataroma's portfolio-history page for 8 funds (Ackman, Valley
  Forge, Tepper, Akre, Buffett, Li Lu, Hohn, Dorsey), all available
  history (2006Q4 → 2026Q2).
- Classify each ticker into a GICS sector via a curated fallback
  dictionary (~250 tickers, including delisted names) and yfinance for
  the long tail. Normalise yfinance labels to canonical GICS names.
- Compute sector weight per fund per quarter as the sum of the top-20
  holdings' portfolio weights within each sector.
- Plot per-fund stacked-bar rotation, aggregate line chart, and a
  latest-quarter fund × sector heatmap.

## Headline results (latest quarter, 2026Q2)

- **Berkshire (Buffett):** Financials 34%, Technology 23%, Communication
  Services 15%, Consumer Staples 14%, Energy 9%.
- **Pershing Square (Ackman):** Consumer Discretionary 33%, Financials
  30%, Communication Services 14%, Real Estate 11%.
- **Appaloosa (Tepper):** Technology 38%, Consumer Discretionary 26%,
  Communication Services 16%.
- **Akre Capital:** Financials 57%, Technology 24%.
- **Valley Forge:** Financials 62%, Technology 38%.
- **TCI (Hohn):** Industrials 46%, Financials 43%.
- **Himalaya (Li Lu):** Communication Services 49% (Alibaba), Consumer
  Discretionary 25%, Financials 25% — China-focused.
- **Dorsey Asset:** Communication Services 29%, Consumer Discretionary
  17%, Healthcare 17%, Technology 17% — diversified growth.

The aggregate view shows a clear Technology and Communication Services
build over the last four quarters, funded partly by a Financials
de-risking.
