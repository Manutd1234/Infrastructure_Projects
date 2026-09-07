"""Congress trading service."""

from __future__ import annotations

from backend.app.repositories.db import query


def trades(
    politician_id: str | None = None,
    ticker: str | None = None,
    party: str | None = None,
    trade_type: str | None = None,
    aligned: bool | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict]:
    sql = "SELECT * FROM congress_trades WHERE 1=1"
    params: list = []
    if politician_id:
        sql += " AND politician_id = ?"; params.append(politician_id)
    if ticker:
        sql += " AND ticker = ?"; params.append(ticker)
    if party:
        sql += " AND party = ?"; params.append(party)
    if trade_type:
        sql += " AND trade_type = ?"; params.append(trade_type)
    if aligned is not None:
        sql += " AND committee_aligned = ?"; params.append(int(aligned))
    if start_date:
        sql += " AND traded >= ?"; params.append(start_date)
    if end_date:
        sql += " AND traded <= ?"; params.append(end_date)
    sql += " ORDER BY traded DESC, published DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    return query(sql, params)


def consensus() -> list[dict]:
    return query(
        "SELECT * FROM ticker_consensus ORDER BY net_signed_usd DESC"
    )


def monthly_consensus() -> list[dict]:
    return query("SELECT * FROM monthly_consensus ORDER BY month")


def committee_signals() -> list[dict]:
    return query(
        "SELECT * FROM committee_signals ORDER BY n_trades DESC"
    )
