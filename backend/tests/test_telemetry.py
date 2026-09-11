"""Tests for WebSocket telemetry tape."""

from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_websocket_telemetry_tape():
    with client.websocket_connect("/ws/telemetry") as ws:
        snapshot = ws.receive_json()
        assert snapshot["type"] == "telemetry_tape"
        assert "market_quotes" in snapshot
        assert "recent_runs" in snapshot

        ws.send_json({"action": "ping"})
        pong = ws.receive_json()
        assert pong["type"] == "pong"
        assert "ts" in pong
