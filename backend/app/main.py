"""FastAPI application entry point.

NUSSIF Infrastructure Projects Transport Layer.
Provides typed REST microservices, AST SQL sandbox, and WebSocket telemetry.

Run:
    uvicorn backend.app.main:app --reload
"""

from __future__ import annotations

import collections
import statistics
import time
import uuid
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import congress, crypto, db, filings, market, ops, telemetry
from backend.app.core.config import settings
from backend.app.core.logging import configure_logging
from backend.app.schemas import HealthReadyResponse, HealthResponse, MetricsResponse

configure_logging(settings.log_level)

# In-memory sliding window for telemetry and latency budget metrics
_LATENCY_HISTORY: collections.deque[float] = collections.deque(maxlen=1000)
_ENDPOINT_COUNTS: collections.defaultdict[str, int] = collections.defaultdict(int)
_TOTAL_REQUESTS: int = 0

app = FastAPI(
    title="NUSSIF Infrastructure Projects API",
    description=(
        "Institutional quantitative operations platform for the National University "
        "of Singapore Students' Investment Fund (NUSSIF). Serves Bitcoin cycle studies, "
        "13F superinvestor sector rotations, and STOCK Act congressional trading signals."
    ),
    version="0.2.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "health", "description": "Liveness, readiness, and latency telemetry metrics"},
        {"name": "crypto", "description": "Bitcoin cycle detection, +3σ breakout studies, and equity curves"},
        {"name": "filings", "description": "13F superinvestor holdings and GICS sector allocations"},
        {"name": "congress", "description": "STOCK Act congressional trades, consensus, and committee signals"},
        {"name": "ops", "description": "Pipeline execution lifecycle and execution audit trail"},
        {"name": "db", "description": "AST sandboxed read-only SQL warehouse browser"},
        {"name": "market", "description": "L1 market quotes and Massive connectivity"},
        {"name": "telemetry", "description": "Real-time WebSocket streaming tape"},
        {"name": "root", "description": "API metadata and service discovery"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_timing_and_id(request: Request, call_next):
    global _TOTAL_REQUESTS
    request.state.request_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000

    # Record metrics
    _TOTAL_REQUESTS += 1
    _LATENCY_HISTORY.append(duration_ms)
    _ENDPOINT_COUNTS[request.url.path] += 1

    response.headers["x-request-id"] = request.state.request_id
    response.headers["x-duration-ms"] = f"{duration_ms:.2f}"
    return response


# ============================================================================
# Health & Telemetry Endpoints
# ============================================================================

@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["health"],
    summary="Liveness Probe",
    description="Check process liveness.",
)
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get(
    "/health/ready",
    response_model=HealthReadyResponse,
    tags=["health"],
    summary="Readiness Probe",
    description="Verify database connectivity, schema table availability, and market provider status.",
)
def health_ready() -> dict[str, Any]:
    try:
        from backend.app.repositories.db import list_tables
        from shared.massive import ping
        tables = list_tables()
        massive = ping()
        return {
            "status": "ready",
            "tables": len(tables),
            "massive": massive,
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"not ready: {e}")


@app.get(
    "/metrics",
    response_model=MetricsResponse,
    tags=["health"],
    summary="Latency Metrics",
    description="Retrieve latency budget quantiles (p50, p95) and request counts.",
)
def get_metrics() -> dict[str, Any]:
    history = list(_LATENCY_HISTORY)
    if not history:
        return {
            "total_requests": _TOTAL_REQUESTS,
            "avg_duration_ms": 0.0,
            "p50_duration_ms": 0.0,
            "p95_duration_ms": 0.0,
            "endpoints": dict(_ENDPOINT_COUNTS),
        }

    history.sort()
    n = len(history)
    p50_idx = int(n * 0.50)
    p95_idx = min(int(n * 0.95), n - 1)

    return {
        "total_requests": _TOTAL_REQUESTS,
        "avg_duration_ms": round(statistics.mean(history), 2),
        "p50_duration_ms": round(history[p50_idx], 2),
        "p95_duration_ms": round(history[p95_idx], 2),
        "endpoints": dict(_ENDPOINT_COUNTS),
    }


# ============================================================================
# Router Registrations (Dual Root + /api Mounts for Client Compatibility)
# ============================================================================

# Root mounts
app.include_router(crypto.router)
app.include_router(filings.router)
app.include_router(congress.router)
app.include_router(ops.router)
app.include_router(db.router, prefix="/db")
app.include_router(market.router)
app.include_router(telemetry.router)

# /api prefixed mounts for direct client or proxy compatibility
app.include_router(crypto.router, prefix="/api")
app.include_router(filings.router, prefix="/api")
app.include_router(congress.router, prefix="/api")
app.include_router(ops.router, prefix="/api")
app.include_router(db.router, prefix="/api/db")
app.include_router(db.router, prefix="/api/database")  # Alias documented in whitepaper
app.include_router(market.router, prefix="/api")


@app.get("/", tags=["root"], summary="Service Discovery")
def root() -> dict[str, Any]:
    return {
        "name": "NUSSIF Infrastructure Projects API",
        "version": app.version,
        "docs": "/docs",
        "openapi": "/openapi.json",
        "websocket_telemetry": "/ws/telemetry",
        "metrics": "/metrics",
        "surfaces": [
            "/crypto",
            "/filings",
            "/congress",
            "/ops",
            "/db",
            "/market",
        ],
    }
