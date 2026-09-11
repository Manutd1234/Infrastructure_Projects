"""Tests for 13F filings microservice endpoints."""

from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_filings_funds():
    res = client.get("/filings/funds")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 8
    codes = [d["code"] for d in data]
    assert "BRK" in codes
    assert "psc" in codes


def test_filings_holdings():
    res = client.get("/filings/holdings?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "fund" in data[0]
    assert "ticker" in data[0]
    assert "company" in data[0]


def test_filings_holdings_filtered():
    res = client.get("/filings/holdings?fund=BRK")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert all(d["fund"] == "BRK" for d in data)


def test_filings_sector_weights():
    res = client.get("/filings/sector-weights")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "sector" in data[0]
    assert "weight" in data[0]


def test_filings_sector_weights_filtered():
    res = client.get("/filings/sector-weights?fund=psc")
    assert res.status_code == 200
    data = res.json()
    assert all(d["fund"] == "psc" for d in data)
