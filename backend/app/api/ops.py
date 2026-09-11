"""Ops endpoints: quantitative pipeline lifecycle management."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Path, Query

from backend.app.core.config import settings
from backend.app.schemas import PipelineRunResponse, TriggerRunResponse
from backend.app.services import ops_service

router = APIRouter(prefix="/ops", tags=["ops"])

ALLOWED_PIPELINES = {"CryptoCycle", "HedgeFund13F", "CongressTrades"}


@router.get(
    "/runs",
    response_model=list[PipelineRunResponse],
    summary="List Pipeline Runs",
    description="Retrieve execution history across all quantitative analysis modules for freshness monitoring.",
)
def list_runs(
    limit: int = Query(50, le=500, ge=1, description="Max runs to return"),
) -> list[dict]:
    return ops_service.list_runs(limit=limit)


@router.get(
    "/run/{pipeline}/status",
    response_model=PipelineRunResponse | None,
    summary="Get Pipeline Status",
    description="Poll the execution state of the most recent run for a specific pipeline.",
    responses={404: {"description": "Unknown pipeline specified"}},
)
def run_status(
    pipeline: str = Path(..., description="Target pipeline ('CryptoCycle', 'HedgeFund13F', 'CongressTrades')"),
) -> dict | None:
    if pipeline not in ALLOWED_PIPELINES:
        raise HTTPException(404, f"unknown pipeline: {pipeline}. Allowed: {sorted(ALLOWED_PIPELINES)}")
    return ops_service.get_latest(pipeline)


@router.post(
    "/run/{pipeline}",
    response_model=TriggerRunResponse,
    status_code=202,
    summary="Trigger Pipeline Run",
    description="Asynchronously launch a quantitative pipeline subprocess. Gated by NUSSIF_ENABLE_RUN_ENDPOINT.",
    responses={
        403: {"description": "Run endpoint disabled in server configuration"},
        404: {"description": "Unknown pipeline"},
        409: {"description": "Pipeline is already actively executing"},
    },
)
def trigger_run(
    pipeline: str = Path(..., description="Target pipeline to execute"),
) -> dict:
    if pipeline not in ALLOWED_PIPELINES:
        raise HTTPException(404, f"unknown pipeline: {pipeline}. Allowed: {sorted(ALLOWED_PIPELINES)}")
    if not settings.enable_run_endpoint:
        raise HTTPException(403, "run endpoint disabled (set NUSSIF_ENABLE_RUN_ENDPOINT=true)")
    if ops_service.is_busy(pipeline):
        raise HTTPException(409, f"pipeline '{pipeline}' is already running")
    run_id = ops_service.trigger(pipeline, triggered_by="dashboard")
    return {"run_id": run_id, "status": "RUNNING"}
