"""Tests for database browser and AST security sandbox endpoints."""

from starlette.testclient import TestClient
from backend.app.main import app

client = TestClient(app)


def test_db_tables():
    res = client.get("/db/tables")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    table_names = [d["name"] for d in data]
    assert "crypto_cycles" in table_names
    assert "congress_trades" in table_names
    assert "fund_holdings" in table_names


def test_db_query_get_safe():
    res = client.get("/db/query?sql=SELECT+name+FROM+sqlite_master+WHERE+type='table'")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_db_query_post_safe():
    res = client.post("/db/query", json={"sql": "SELECT COUNT(*) AS total FROM crypto_cycles", "limit": 10})
    assert res.status_code == 200
    data = res.json()
    assert "rows" in data
    assert "count" in data
    assert data["count"] == 1
    assert "total" in data["rows"][0]


def test_db_ast_blocks_drop():
    res = client.get("/db/query?sql=DROP+TABLE+crypto_cycles")
    assert res.status_code == 403
    assert "rejected by AST sandbox" in res.json()["detail"] or "only SELECT" in res.json()["detail"]


def test_db_ast_blocks_delete():
    res = client.get("/db/query?sql=DELETE+FROM+crypto_cycles")
    assert res.status_code == 403


def test_db_ast_blocks_update():
    res = client.get("/db/query?sql=UPDATE+crypto_cycles+SET+type='bear'")
    assert res.status_code == 403


def test_db_ast_blocks_insert():
    res = client.get("/db/query?sql=INSERT+INTO+crypto_cycles+VALUES+(1)")
    assert res.status_code == 403


def test_db_ast_blocks_multistatement_injection():
    res = client.get("/db/query?sql=SELECT+1;+DROP+TABLE+crypto_cycles;")
    assert res.status_code == 403
    assert "multiple chained SQL statements" in res.json()["detail"]


def test_db_api_alias_endpoint():
    res = client.get("/api/database/tables")
    assert res.status_code == 200
    assert len(res.json()) > 0
