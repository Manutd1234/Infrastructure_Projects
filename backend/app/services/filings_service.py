"""13F filings service."""

from __future__ import annotations

from backend.app.repositories.db import query


def funds() -> list[dict]:
    rows = query("SELECT code, name FROM funds ORDER BY code")
    if rows:
        return rows
    return query(
        "SELECT DISTINCT fund AS code, fund AS name FROM sector_weights ORDER BY fund"
    )


def holdings(fund: str | None = None, quarter: str | None = None) -> list[dict]:
    sql = "SELECT * FROM fund_holdings WHERE 1=1"
    params: list = []
    if fund:
        sql += " AND fund = ?"
        params.append(fund)
    if quarter:
        sql += " AND quarter = ?"
        params.append(quarter)
    sql += " ORDER BY fund, quarter, rank"
    return query(sql, params)


def sector_weights(fund: str | None = None) -> list[dict]:
    sql = "SELECT * FROM sector_weights WHERE 1=1"
    params: list = []
    if fund:
        sql += " AND fund = ?"
        params.append(fund)
    sql += " ORDER BY fund, quarter, sector"
    return query(sql, params)
