"""Tests for ops microservice endpoints."""

from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_ops_runs():
    res = client.get("/ops/runs")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "pipeline" in first
    assert "status" in first
    assert "started_at" in first


def test_ops_run_status():
    res = client.get("/ops/run/CryptoCycle/status")
    assert res.status_code == 200
    data = res.json()
    if data is not None:
        assert data["pipeline"] == "CryptoCycle"


def test_ops_run_status_unknown_pipeline():
    res = client.get("/ops/run/NonExistentPipeline/status")
    assert res.status_code == 404


def test_ops_trigger_unknown_pipeline():
    res = client.post("/ops/run/InvalidPipeline")
    assert res.status_code == 404
