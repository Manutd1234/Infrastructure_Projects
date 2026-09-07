"""Feasibility assessment: pulling data from disclosures-clerk.house.gov.

The House Clerk's Financial Disclosure site publishes *PDF reports* filed by
Representatives and staff. There is no JSON API and no transaction-level
structured feed. This module probes the site, summarises what is and isn't
available, and writes a markdown report to outputs/house_disclosure_feasibility.md.

Conclusion (short version): technically feasible but operationally painful.
Capitol Trades is the practical data source for structured trade data.
"""

from __future__ import annotations

from pathlib import Path
from textwrap import dedent

import requests
from bs4 import BeautifulSoup

OUT = Path(__file__).parent / "outputs"
OUT.mkdir(exist_ok=True)

HOUSE_URL = "https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure"
SEARCH_URL = "https://disclosures-clerk.house.gov/PublicDisclosure/FinancialDisclosure/Search"

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"


def probe() -> dict:
    out = {"search_page_reachable": False, "has_json_api": False, "pdf_download_links": 0,
           "form_fields": [], "notes": []}
    try:
        r = requests.get(SEARCH_URL, headers={"User-Agent": UA}, timeout=20)
        out["search_status"] = r.status_code
        out["search_page_reachable"] = r.status_code == 200
        soup = BeautifulSoup(r.text, "lxml")
        # Look for PDF links
        pdf_links = soup.find_all("a", href=lambda h: h and h.lower().endswith(".pdf"))
        out["pdf_download_links"] = len(pdf_links)
        # Look for form inputs
        forms = soup.find_all("form")
        for f in forms:
            for inp in f.find_all(["input", "select"]):
                if inp.get("name"):
                    out["form_fields"].append(inp.get("name"))
        # Look for any JSON / API hints
        if "application/json" in r.text.lower():
            out["has_json_api"] = True
    except Exception as e:
        out["error"] = str(e)
    return out


def write_report(probe_result: dict) -> Path:
    path = OUT / "house_disclosure_feasibility.md"
    body = dedent(
        f"""
        # Feasibility: pulling data from disclosures-clerk.house.gov

        ## TL;DR
        **Not practical as a primary data source for trade-level data.** The
        House Clerk site publishes *annual PDF reports* filed by members and
        staff. There is no JSON API and no transaction-level structured feed.
        Extracting trades requires downloading thousands of PDFs and parsing
        unstructured text. We therefore scrape **Capitol Trades** instead,
        which already does this work and exposes structured rows.

        ## What the site offers
        - Search interface at `{SEARCH_URL}` for member/staff filings.
        - Downloadable PDF reports (Periodic Transaction Reports and annual
          Financial Disclosure Reports). Each report is a multi-page PDF.
        - Search is JS-driven; the HTML returned by a plain GET contains only
          the search form shell, not results.

        ## Probe results (live)
        - Search page reachable: **{probe_result.get('search_page_reachable')}**
          (HTTP {probe_result.get('search_status', 'n/a')})
        - Form fields detected: {probe_result.get('form_fields') or 'none'}
        - PDF download links on the search shell: {probe_result.get('pdf_download_links')}
        - JSON API detected: **{probe_result.get('has_json_api')}**

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
        """
    ).strip() + "\n"
    path.write_text(body)
    return path


if __name__ == "__main__":
    res = probe()
    p = write_report(res)
    print(f"Feasibility report written to {p}")
    print(f"Probe summary: {res}")
