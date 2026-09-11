"""13F filings service.

Provides institutional hedge-fund holdings, sector allocations, and tracked fund registries.
All queries use explicit column projections per institutional coding standards.
"""

from __future__ import annotations

from typing import Any
from backend.app.repositories.db import query


def funds() -> list[dict[str, Any]]:
    """Return all tracked 13F investment funds.

    Returns:
        List of fund dictionaries containing code and institutional manager name.
    """
    rows = query("SELECT code, name FROM funds ORDER BY code")
    if rows:
        return rows
    return query(
        "SELECT DISTINCT fund AS code, fund AS name FROM sector_weights ORDER BY fund"
    )


def holdings(fund: str | None = None, quarter: str | None = None) -> list[dict[str, Any]]:
    """Return portfolio holdings filtered by fund and quarter.

    Args:
        fund: Optional fund ticker code (e.g., 'BRK', 'psc', 'AM').
        quarter: Optional quarter identifier (e.g., '2026Q1').

    Returns:
        List of holdings records ordered by fund, quarter, and rank.
    """
    sql = (
        "SELECT id, fund, quarter, quarter_label, portfolio_value, rank, "
        "ticker, company, weight, sector, run_id "
        "FROM fund_holdings WHERE 1=1"
    )
    params: list[Any] = []
    if fund:
        sql += " AND fund = ?"
        params.append(fund)
    if quarter:
        sql += " AND quarter = ?"
        params.append(quarter)
    sql += " ORDER BY fund, quarter, rank"
    return query(sql, params)


def sector_weights(fund: str | None = None) -> list[dict[str, Any]]:
    """Return quarterly GICS sector weight allocations for tracked funds.

    Args:
        fund: Optional fund ticker code filter.

    Returns:
        List of sector weight records ordered chronologically by fund, quarter, and sector.
    """
    sql = (
        "SELECT id, fund, quarter, sector, weight, run_id "
        "FROM sector_weights WHERE 1=1"
    )
    params: list[Any] = []
    if fund:
        sql += " AND fund = ?"
        params.append(fund)
    sql += " ORDER BY fund, quarter, sector"
    return query(sql, params)
