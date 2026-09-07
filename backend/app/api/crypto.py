"""Crypto endpoints."""

from __future__ import annotations

from fastapi import APIRouter

from backend.app.services import crypto_service

router = APIRouter(prefix="/crypto", tags=["crypto"])


@router.get("/cycles")
def get_cycles():
    return crypto_service.cycles()


@router.get("/bear-markets")
def get_bear_markets():
    return crypto_service.bear_markets()


@router.get("/breakouts")
def get_breakouts():
    return crypto_service.breakouts()


@router.get("/breakout-dates")
def get_breakout_dates():
    return crypto_service.breakout_dates()


@router.get("/drawdowns")
def get_drawdowns():
    return crypto_service.drawdowns()


@router.get("/performance")
def get_performance():
    return crypto_service.performance()
