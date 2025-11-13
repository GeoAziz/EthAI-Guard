import pytest
from fastapi.testclient import TestClient
from app.main import app


client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_bias_endpoint():
    payload = {"features": {"age": 30, "income": 50000}}
    r = client.post("/api/v1/bias", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "reports" in data


def test_explain_endpoint():
    payload = {"features": {"age": 30, "income": 50000}}
    r = client.post("/api/v1/explain", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "explanation" in data
