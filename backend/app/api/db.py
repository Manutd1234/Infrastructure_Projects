"""Database browser endpoints with AST SQL security sandbox."""

from __future__ import annotations

import re
import time
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Query

from backend.app.repositories.db import list_tables, query, table_row_count
from backend.app.schemas import QueryRequest, QueryResponse, TableInfoResponse

router = APIRouter(tags=["db"])

# AST token guards for read-only sandboxing
_SELECT_TOKEN_RE = re.compile(r"^\s*(?:EXPLAIN\s+QUERY\s+PLAN\s+)?SELECT\b", re.IGNORECASE)
_FORBIDDEN_TOKENS = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|REPLACE|VACUUM|TRUNCATE|EXEC|GRANT|REVOKE)\b",
    re.IGNORECASE,
)
_SEMICOLON_CHAIN_RE = re.compile(r";\s*\S+")


def validate_read_only_ast(sql: str) -> str:
    """Parse and validate SQL statement to enforce strict read-only execution.

    Args:
        sql: Raw SQL query string submitted by client.

    Returns:
        Cleaned SQL string.

    Raises:
        HTTPException: 400 or 403 if statement violates read-only guardrails.
    """
    clean = sql.strip()
    if not clean:
        raise HTTPException(status_code=400, detail="SQL statement cannot be empty")

    # Guard 1: Disallow multiple chained statements (semicolon injection)
    if _SEMICOLON_CHAIN_RE.search(clean):
        raise HTTPException(
            status_code=403,
            detail="Security violation: multiple chained SQL statements are disallowed by the AST sandbox",
        )

    # Guard 2: Must begin with SELECT or EXPLAIN QUERY PLAN
    if not _SELECT_TOKEN_RE.match(clean):
        raise HTTPException(
            status_code=403,
            detail="Read-Only AST Enforcement: only SELECT statements are permitted",
        )

    # Guard 3: Reject mutation tokens anywhere in statement (including subqueries)
    match = _FORBIDDEN_TOKENS.search(clean)
    if match:
        raise HTTPException(
            status_code=403,
            detail=f"Security violation: forbidden mutation token '{match.group(1)}' rejected by AST sandbox",
        )

    return clean


@router.get(
    "/tables",
    response_model=list[TableInfoResponse],
    summary="List Database Tables",
    description="Retrieve all tables and current row counts from the SQLite data warehouse.",
)
def get_tables() -> list[dict]:
    rows = list_tables()
    return [{"name": r["name"], "rows": table_row_count(r["name"])} for r in rows]


@router.get(
    "/query",
    summary="Run Read-Only Query (GET)",
    description="Execute an ad-hoc SELECT statement through the AST security sandbox. Capped at 1000 rows.",
)
def run_query_get(
    sql: str = Query(..., description="SELECT query string (read-only AST enforced)"),
    limit: int = Query(1000, le=1000, ge=1, description="Row limit"),
) -> list[dict[str, Any]]:
    clean_sql = validate_read_only_ast(sql)
    if not re.search(r"\bLIMIT\b", clean_sql, re.IGNORECASE):
        clean_sql = f"{clean_sql.rstrip(';')} LIMIT {limit}"
    try:
        return query(clean_sql, read_only=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {e}")


@router.post(
    "/query",
    response_model=QueryResponse,
    summary="Run Sandboxed Query (POST)",
    description="Submit a query payload to the AST security sandbox and return rows with latency telemetry.",
)
def run_query_post(
    payload: QueryRequest = Body(..., description="SQL statement payload"),
) -> QueryResponse:
    clean_sql = validate_read_only_ast(payload.sql)
    if not re.search(r"\bLIMIT\b", clean_sql, re.IGNORECASE):
        clean_sql = f"{clean_sql.rstrip(';')} LIMIT {payload.limit}"

    start = time.perf_counter()
    try:
        rows = query(clean_sql, read_only=True)
        dur_ms = round((time.perf_counter() - start) * 1000, 2)
        return QueryResponse(rows=rows, count=len(rows), duration_ms=dur_ms)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Query failed: {e}")
