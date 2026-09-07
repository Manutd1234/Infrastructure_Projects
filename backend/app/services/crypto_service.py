"""Crypto pipeline service."""

from __future__ import annotations

from backend.app.repositories.db import query


def cycles() -> list[dict]:
    return query("SELECT * FROM crypto_cycles ORDER BY start_date")


def bear_markets() -> list[dict]:
    return query(
        "SELECT * FROM crypto_cycles WHERE type='bear' ORDER BY start_date"
    )


def breakouts() -> list[dict]:
    return query("SELECT * FROM crypto_breakouts ORDER BY horizon")


def breakout_dates() -> list[dict]:
    return query("SELECT signal_date FROM crypto_breakout_dates ORDER BY signal_date")


def drawdowns() -> list[dict]:
    return query(
        "SELECT * FROM crypto_drawdowns ORDER BY max_drawdown ASC LIMIT 15"
    )


def performance() -> list[dict]:
    return query("SELECT * FROM crypto_performance")
