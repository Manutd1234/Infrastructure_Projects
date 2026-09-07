"""Ops endpoints: pipeline run management."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from backend.app.core.config import settings
from backend.app.services import ops_service

router = APIRouter(prefix="/ops", tags=["ops"])

# The three analysis modules at the repo root.
ALLOWED_PIPELINES = {"CryptoBullCycle", "ThirteenFFilings", "CongressTrading"}


@router.get("/runs")
def list_runs(limit: int = 50):
    return ops_service.list_runs(limit=limit)


@router.get("/run/{pipeline}/status")
def run_status(pipeline: str):
    if pipeline not in ALLOWED_PIPELINES:
        raise HTTPException(404, "unknown pipeline")
    return ops_service.get_latest(pipeline)


@router.post("/run/{pipeline}")
def trigger_run(pipeline: str):
    if pipeline not in ALLOWED_PIPELINES:
        raise HTTPException(404, "unknown pipeline")
    if not settings.enable_run_endpoint:
        raise HTTPException(403, "run endpoint disabled (set NUSSIF_ENABLE_RUN_ENDPOINT=true)")
    if ops_service.is_busy(pipeline):
        raise HTTPException(409, "pipeline already running")
    run_id = ops_service.trigger(pipeline, triggered_by="dashboard")
    return {"run_id": run_id, "status": "RUNNING"}
