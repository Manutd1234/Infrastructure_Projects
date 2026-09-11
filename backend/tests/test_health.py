"""Tests for health, readiness, and metrics endpoints."""

from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_health_liveness():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ok"


def test_health_readiness():
    res = client.get("/health/ready")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "ready"
    assert "tables" in data
    assert data["tables"] >= 15
    assert "massive" in data


def test_metrics_endpoint():
    res = client.get("/metrics")
    assert res.status_code == 200
    data = res.json()
    assert "total_requests" in data
    assert "avg_duration_ms" in data
    assert "p50_duration_ms" in data
    assert "p95_duration_ms" in data
    assert "endpoints" in data


def test_root_discovery():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert "name" in data
    assert "version" in data
    assert "surfaces" in data
    assert "/crypto" in data["surfaces"]
    assert "/market" in data["surfaces"]
