"""Database browser endpoints (read-only)."""

from __future__ import annotations

import re

from fastapi import APIRouter, HTTPException, Query

from backend.app.repositories.db import list_tables, query, table_row_count

router = APIRouter(prefix="/db", tags=["db"])

# Reject anything that isn't a SELECT. This is a defence-in-depth check; the
# sqlite3 connection is read-only at the DB level for /db/query in production.
_SELECT_RE = re.compile(r"^\s*SELECT\b", re.IGNORECASE)
_FORBIDDEN = re.compile(
    r"\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|ATTACH|DETACH|PRAGMA|REPLACE|VACUUM)\b",
    re.IGNORECASE,
)


@router.get("/tables")
def get_tables():
    rows = list_tables()
    return [{"name": r["name"], "rows": table_row_count(r["name"])} for r in rows]


@router.get("/query")
def run_query(
    sql: str = Query(..., description="SELECT only; results capped at 1000 rows"),
    limit: int = Query(1000, le=1000),
):
    if not _SELECT_RE.match(sql):
        raise HTTPException(400, "only SELECT statements are allowed")
    if _FORBIDDEN.search(sql):
        raise HTTPException(400, "forbidden keyword in query")
    # Inject a LIMIT if none present (defence-in-depth)
    if not re.search(r"\bLIMIT\b", sql, re.IGNORECASE):
        sql = f"{sql.rstrip(';')} LIMIT {limit}"
    try:
        return query(sql)
    except Exception as e:
        raise HTTPException(400, f"query failed: {e}")
