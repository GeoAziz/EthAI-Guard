from fastapi.testclient import TestClient
from main import app


client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200


def test_analyze():
    payload = {"dataset_name": "demo", "data": {"age": [20,30], "income": [100,200]}}
    r = client.post("/ai_core/analyze", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "analysis_id" in data
