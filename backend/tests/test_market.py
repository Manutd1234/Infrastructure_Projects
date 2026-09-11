"""Tests for market data endpoints."""

from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_market_status():
    res = client.get("/market/status")
    assert res.status_code == 200
    data = res.json()
    assert "configured" in data
    assert "provider" in data
    assert data["provider"] == "massive"


def test_market_quotes():
    res = client.get("/market/quotes?tickers=SPY,QQQ")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    tickers = [d["ticker"] for d in data]
    assert "SPY" in tickers
    assert "QQQ" in tickers
