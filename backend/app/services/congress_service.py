"""Congress trading service.

Provides STOCK Act congressional trade disclosures, ticker-level net signed USD consensus,
monthly aggregate volume trends, and committee oversight jurisdictional signals.
All database queries use explicit column projections per institutional standards.
"""

from __future__ import annotations

from typing import Any
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
) -> list[dict[str, Any]]:
    """Return filtered congressional trade disclosure transactions.

    Args:
        politician_id: Unique politician identifier (e.g. 'P000197').
        ticker: Asset ticker symbol (e.g. 'NVDA', 'AAPL').
        party: Political party ('Democrat', 'Republican', 'Independent').
        trade_type: Transaction type ('purchase', 'sale', 'exchange').
        aligned: Whether transaction aligns with politician's committee jurisdiction.
        start_date: Traded start date (YYYY-MM-DD).
        end_date: Traded end date (YYYY-MM-DD).
        limit: Max rows returned (pagination limit).
        offset: Number of rows skipped (pagination offset).

    Returns:
        List of trade dictionaries with transaction and committee metadata.
    """
    sql = (
        "SELECT trade_id, politician_id, politician, party, chamber, state, "
        "issuer, ticker, published, traded, filed_after_days, owner, "
        "trade_type, size_raw, size_low_usd, size_high_usd, price, sector, "
        "committee_aligned, matching_committees, run_id "
        "FROM congress_trades WHERE 1=1"
    )
    params: list[Any] = []
    if politician_id:
        sql += " AND politician_id = ?"
        params.append(politician_id)
    if ticker:
        sql += " AND ticker = ?"
        params.append(ticker)
    if party:
        sql += " AND party = ?"
        params.append(party)
    if trade_type:
        sql += " AND trade_type = ?"
        params.append(trade_type)
    if aligned is not None:
        sql += " AND committee_aligned = ?"
        params.append(int(aligned))
    if start_date:
        sql += " AND traded >= ?"
        params.append(start_date)
    if end_date:
        sql += " AND traded <= ?"
        params.append(end_date)
    sql += " ORDER BY traded DESC, published DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    return query(sql, params)


def consensus() -> list[dict[str, Any]]:
    """Return ticker-level consensus rankings aggregated by net signed USD.

    Returns:
        List of ticker consensus records with buy/sell counts and BUY/SELL flags.
    """
    return query(
        "SELECT ticker, issuer, sector, n_trades, n_buy, n_sell, "
        "net_signed_usd, n_politicians, buy_pct, consensus, run_id "
        "FROM ticker_consensus ORDER BY net_signed_usd DESC"
    )


def monthly_consensus() -> list[dict[str, Any]]:
    """Return monthly aggregate net congressional trade volumes.

    Returns:
        List of monthly consensus records ordered chronologically.
    """
    return query(
        "SELECT month, n_trades, n_buy, n_sell, net_signed_usd, buy_share, run_id "
        "FROM monthly_consensus ORDER BY month"
    )


def committee_signals() -> list[dict[str, Any]]:
    """Return committee oversight trading activity and volume signals.

    Returns:
        List of committee signal records ordered by trade count.
    """
    return query(
        "SELECT committee, n_trades, n_buy, n_sell, n_politicians, "
        "total_size_low_usd, run_id "
        "FROM committee_signals ORDER BY n_trades DESC"
    )
