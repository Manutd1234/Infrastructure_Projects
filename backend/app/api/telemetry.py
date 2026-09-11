"""Real-time WebSocket telemetry tape streaming market prices and pipeline state."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from backend.app.services import ops_service
from shared.massive import prev_close

logger = logging.getLogger("nussif.telemetry")

router = APIRouter(tags=["telemetry"])


class TelemetryConnectionManager:
    """Manages active WebSocket client connections and fan-out broadcasts."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected. Active: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)
        logger.info(f"WebSocket client disconnected. Active: {len(self.active_connections)}")

    async def broadcast(self, message: dict[str, Any]) -> None:
        payload = json.dumps(message, default=str)
        async with self._lock:
            stale: list[WebSocket] = []
            for connection in self.active_connections:
                try:
                    await connection.send_text(payload)
                except Exception:
                    stale.append(connection)
            for s in stale:
                if s in self.active_connections:
                    self.active_connections.remove(s)


manager = TelemetryConnectionManager()


def get_tape_snapshot() -> dict[str, Any]:
    """Generate instantaneous cross-asset market tape and pipeline state."""
    tickers = ["X:BTCUSD", "SPY", "QQQ", "IWM"]
    quotes = []
    for sym in tickers:
        q = prev_close(sym)
        if q:
            quotes.append(q)
        else:
            quotes.append({"ticker": sym, "close": None})

    runs = ops_service.list_runs(limit=3)
    return {
        "type": "telemetry_tape",
        "ts": datetime.now(timezone.utc).isoformat(),
        "market_quotes": quotes,
        "recent_runs": runs,
    }


@router.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket) -> None:
    """WebSocket endpoint for real-time telemetry streaming to the Trading Desk."""
    await manager.connect(websocket)
    # Send immediate initial snapshot upon connecting
    initial_tape = get_tape_snapshot()
    await websocket.send_text(json.dumps(initial_tape, default=str))

    try:
        while True:
            # Listen for client frames or pings with a timeout to send periodic updates
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=15.0)
                try:
                    parsed = json.loads(data)
                    action = parsed.get("action")
                    if action == "ping":
                        await websocket.send_text(json.dumps({
                            "type": "pong",
                            "ts": datetime.now(timezone.utc).isoformat(),
                        }))
                    elif action == "refresh":
                        await websocket.send_text(json.dumps(get_tape_snapshot(), default=str))
                except json.JSONDecodeError:
                    pass
            except asyncio.TimeoutError:
                # Send periodic heartbeat / market tape update every 15s
                snapshot = get_tape_snapshot()
                await websocket.send_text(json.dumps(snapshot, default=str))
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket session terminated: {e}")
        await manager.disconnect(websocket)
