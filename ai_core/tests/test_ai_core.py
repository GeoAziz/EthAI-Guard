from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from ai_core.main import app


client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200


@patch('ai_core.routers.analyze.get_db')
@patch('ai_core.routers.analyze.store_analysis')
def test_analyze(mock_store, mock_get_db):
    # Mock the database calls to avoid needing a real MongoDB instance
    mock_db = MagicMock()
    mock_get_db.return_value = mock_db
    mock_store.return_value = "test_analysis_id_123"
    
    payload = {"dataset_name": "demo", "data": {"age": [20,30], "income": [100,200]}}
    r = client.post("/ai_core/analyze", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "analysis_id" in data
    assert data["analysis_id"] == "test_analysis_id_123"
