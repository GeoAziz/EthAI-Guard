import json
import pytest
from fastapi.testclient import TestClient

try:
    from ai_core.main import app
except Exception:
    from main import app

client = TestClient(app)


def test_analyze_rejects_non_mapping():
    # Sending wrong type triggers pydantic validation -> 422
    res = client.post("/ai_core/analyze", json={"dataset_name": "bad", "data": "not-a-mapping"})
    assert res.status_code == 422


def test_analyze_rejects_mismatched_lengths():
    payload = {"dataset_name": "mismatch", "data": {"a": [1,2,3], "b": [1,2]}}
    res = client.post("/ai_core/analyze", json=payload)
    assert res.status_code == 400


def test_analyze_accepts_zero_variance_column(monkeypatch):
    # Patch persistence to avoid needing a live MongoDB during unit tests
    def fake_store(db, name, doc):
        return "fakeid123"

    # monkeypatch store_analysis used by the analyze router (module-level binding)
    monkeypatch.setattr("ai_core.routers.analyze.store_analysis", fake_store)
    payload = {"dataset_name": "zero_var", "data": {"a": [1,1,1,1], "b": [2,3,4,5]}}
    res = client.post("/ai_core/analyze", json=payload)
    # Should accept and return 200 with json containing analysis_id and summary
    assert res.status_code == 200
    j = res.json()
    assert "analysis_id" in j and "summary" in j


def test_analyze_rejects_oversize_column(monkeypatch):
    # Patch persistence to avoid a real DB
    monkeypatch.setattr("ai_core.routers.analyze.store_analysis", lambda db, name, doc: "fakeid")
    # Build a single column exceeding MAX_ROWS (use 100001 if default MAX_ROWS=100000)
    big = list(range(100001))
    payload = {"dataset_name": "big", "data": {"a": big}}
    res = client.post("/ai_core/analyze", json=payload)
    assert res.status_code == 400
