"""FastAPI application entry point.

Run:
    uvicorn backend.app.main:app --reload
"""

from __future__ import annotations

import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import congress, crypto, db, filings, ops
from backend.app.core.config import settings
from backend.app.core.logging import configure_logging

configure_logging(settings.log_level)

app = FastAPI(
    title="NUSSIF Infrastructure Projects API",
    description="Transport layer for the Trading Desk dashboard.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id(request: Request, call_next):
    request.state.request_id = str(uuid.uuid4())[:8]
    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = int((time.perf_counter() - start) * 1000)
    response.headers["x-request-id"] = request.state.request_id
    response.headers["x-duration-ms"] = str(duration_ms)
    return response


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}


@app.get("/health/ready", tags=["health"])
def health_ready():
    try:
        from backend.app.repositories.db import list_tables
        tables = list_tables()
        return {"status": "ready", "tables": len(tables)}
    except Exception as e:
        from fastapi import HTTPException
        raise HTTPException(503, f"not ready: {e}")


# Routers
app.include_router(crypto.router)
app.include_router(filings.router)
app.include_router(congress.router)
app.include_router(ops.router)
app.include_router(db.router)


@app.get("/", tags=["root"])
def root():
    return {
        "name": "NUSSIF Infrastructure Projects API",
        "version": app.version,
        "docs": "/docs",
        "endpoints": ["/crypto", "/filings", "/congress", "/ops", "/db"],
    }
