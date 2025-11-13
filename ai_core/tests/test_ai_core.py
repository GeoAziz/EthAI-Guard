from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock


# Allow tests to be run either from the repository root (where `ai_core` is a package)
# or from inside the `ai_core` directory (some CI runners `cd` into the package).
# Determine the correct import path and patch target dynamically.
try:
    # prefer package-qualified import when possible
    from ai_core.main import app
    ANALYZE_PATCH_TARGET = 'ai_core.routers.analyze'
except Exception:
    # fallback for running tests from inside ai_core/ (imports without package prefix)
    from main import app
    ANALYZE_PATCH_TARGET = 'routers.analyze'


client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200


@patch(f"{ANALYZE_PATCH_TARGET}.get_db")
@patch(f"{ANALYZE_PATCH_TARGET}.store_analysis")
def test_analyze(mock_store, mock_get_db):
    # Mock the database calls to avoid needing a real MongoDB instance
    mock_db = MagicMock()
    mock_get_db.return_value = mock_db
    mock_store.return_value = "test_analysis_id_123"

    payload = {"dataset_name": "demo", "data": {"age": [20, 30], "income": [100, 200]}}
    r = client.post("/ai_core/analyze", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "analysis_id" in data
    assert data["analysis_id"] == "test_analysis_id_123"
