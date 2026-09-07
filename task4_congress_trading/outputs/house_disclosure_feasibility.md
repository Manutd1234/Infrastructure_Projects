# Feasibility: pulling data from disclosures-clerk.house.gov

## TL;DR
**Not practical as a primary data source for trade-level data.** The
House Clerk site publishes *annual PDF reports* filed by members and
staff. There is no JSON API and no transaction-level structured feed.
Extracting trades requires downloading thousands of PDFs and parsing
unstructured text. We therefore scrape **Capitol Trades** instead,
which already does this work and exposes structured rows.

## What the site offers
- Search interface at `https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure/Search` for member/staff filings.
- Downloadable PDF reports (Periodic Transaction Reports and annual
  Financial Disclosure Reports). Each report is a multi-page PDF.
- Search is JS-driven; the HTML returned by a plain GET contains only
  the search form shell, not results.

## Probe results (live)
- Search page reachable: **True**
  (HTTP 200)
- Form fields detected: ['clerk-search-mobile']
- PDF download links on the search shell: 10
- JSON API detected: **False**

## What it would take to use this source
1. Drive the JS search (Playwright/Selenium) or reverse-engineer the
   search handler to retrieve filing IDs per member per year.
2. Download each PDF (potentially thousands per Congress).
3. OCR / text-extract each PDF (pdfplumber, PyMuPDF, or Tika).
4. Regex out transactions: ticker, company, buy/sell, date, amount
   range. The PTR format is semi-structured but varies across years
   and filers.
5. Map company names to tickers (fuzzy matching against a reference).
6. Resolve committee assignments from a *separate* source
   (congress.gov / clerk.house.gov member pages) — the disclosure
   PDFs do not list committees.

Each step is doable but together they are a multi-week engineering
project, and the resulting data would still lag Capitol Trades (which
already cleans and publishes the same information).

## Decision
Use **Capitol Trades** (`https://www.capitoltrades.com/trades`) as
the data source. It exposes structured rows (politician, ticker,
traded date, filed date, owner, buy/sell, size range, price) scraped
from the underlying House and Senate disclosures. Committee
assignments are supplemented from a curated committee → sector and
politician → committee mapping (see `committee_signals.py`).
