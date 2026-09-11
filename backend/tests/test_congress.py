"""Tests for congressional trading disclosure microservice endpoints."""

from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_congress_trades():
    res = client.get("/congress/trades?limit=10")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "trade_id" in first
    assert "politician" in first
    assert "trade_type" in first


def test_congress_trades_filtered():
    res = client.get("/congress/trades?party=Democrat&limit=10")
    assert res.status_code == 200
    data = res.json()
    assert all(d["party"] == "Democrat" for d in data)


def test_congress_consensus():
    res = client.get("/congress/consensus")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "ticker" in first
    assert "net_signed_usd" in first
    assert "consensus" in first
    assert first["consensus"] in ("BUY", "SELL", "NEUTRAL")


def test_congress_monthly_consensus():
    res = client.get("/congress/consensus/monthly")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "month" in data[0]
    assert "net_signed_usd" in data[0]


def test_congress_committees():
    res = client.get("/congress/committees")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "committee" in data[0]
    assert "n_trades" in data[0]
