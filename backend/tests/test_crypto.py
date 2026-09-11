"""Tests for crypto microservice endpoints."""

from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_crypto_cycles():
    res = client.get("/crypto/cycles")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "type" in first
    assert "start_date" in first
    assert "end_date" in first
    assert first["type"] in ("bull", "bear")


def test_crypto_bear_markets():
    res = client.get("/crypto/bear-markets")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert all(d["type"] == "bear" for d in data)


def test_crypto_breakouts():
    res = client.get("/crypto/breakouts")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 4
    horizons = [d["horizon"] for d in data]
    assert 30 in horizons
    assert 60 in horizons


def test_crypto_breakout_dates():
    res = client.get("/crypto/breakout-dates")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "signal_date" in data[0]


def test_crypto_drawdowns():
    res = client.get("/crypto/drawdowns")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) <= 15
    assert all(d["max_drawdown"] <= 0 for d in data)


def test_crypto_performance():
    res = client.get("/crypto/performance")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) >= 3
    strategies = [d["strategy"] for d in data]
    assert "Breakout Strategy" in strategies


def test_crypto_equity_curve():
    res = client.get("/crypto/equity-curve")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "strategy" in data[0]
    assert "date" in data[0]
