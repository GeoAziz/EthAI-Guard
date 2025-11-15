import os
import sys
import types
import pytest
from unittest.mock import MagicMock

# Ensure package import works from different CWDs
THIS_DIR = os.path.dirname(__file__)
REPO_ROOT = os.path.abspath(os.path.join(THIS_DIR, "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)

# Inject lightweight fake helper modules into sys.modules before importing the app.
# This ensures tests don't import heavy native deps (shap/matplotlib) at collection time
# and allows analyze to import these modules at runtime (via importlib.import_module).

# Fake model helper module
class DummyModel:
    def __init__(self, y):
        import numpy as _np
        self._y = _np.asarray(y)

    def predict(self, X):
        return self._y


def _fake_train(X, y):
    return DummyModel(y)


def _fake_explain(model, X):
    return {c: 0.1 for c in X.columns}

mh_mod = types.ModuleType("ai_core.utils.model_helper")
setattr(mh_mod, "train_quick_model", _fake_train)
setattr(mh_mod, "explain_model", _fake_explain)
sys.modules["ai_core.utils.model_helper"] = mh_mod
sys.modules["utils.model_helper"] = mh_mod

# Fake persistence module
persist_mod = types.ModuleType("ai_core.utils.persistence")
persist_mod.get_db = lambda: MagicMock()  # type: ignore
# default store_analysis; tests will override this attribute as needed
persist_mod.store_analysis = lambda db, name, doc: "analysis_default"  # type: ignore
sys.modules["ai_core.utils.persistence"] = persist_mod
sys.modules["utils.persistence"] = persist_mod

# Fake fairlens helper
ff_mod = types.ModuleType("ai_core.utils.fairlens_helper")
ff_mod.run_fairness_stub = lambda meta: {"n_rows": int(meta.get("n_rows", 0))}  # type: ignore
sys.modules["ai_core.utils.fairlens_helper"] = ff_mod
sys.modules["utils.fairlens_helper"] = ff_mod

# Fake dataset generator
ds_mod = types.ModuleType("ai_core.utils.dataset")
import pandas as _pd

def _gen_demo(n=50):
    # simple balanced demo
    return _pd.DataFrame({"feature": [1, 0] * (n//2), "sensitive": [0, 1] * (n//2)}), _pd.Series([1, 0] * (n//2))

ds_mod.generate_bias_demo = _gen_demo  # type: ignore
sys.modules["ai_core.utils.dataset"] = ds_mod
sys.modules["utils.dataset"] = ds_mod

# Force strict fairness handling for tests
os.environ["AI_CORE_STRICT_FAIRNESS"] = "1"

# Now import the app
from ai_core.main import app
from fastapi.testclient import TestClient

client = TestClient(app)


def test_analyze_rejects_fairness_violation():
    # Arrange: make store_analysis a no-op that would be ignored if fairness fails
    persist_mod.store_analysis = lambda db, name, doc: "will_not_be_stored"  # type: ignore

    payload = {
        "dataset_name": "demo",
        "data": {
            "feature": [1, 1, 0, 0],
            "sensitive": [0, 0, 1, 1],
            "target": [1, 1, 0, 0],
        },
    }

    # Act
    r = client.post("/ai_core/analyze", json=payload)

    # Assert
    assert r.status_code == 400
    body = r.json()
    assert body.get("detail", {}).get("msg") == "fairness_violation"


def test_analyze_accepts_balanced_data():
    # Arrange: set store_analysis to return expected id
    persist_mod.store_analysis = lambda db, name, doc: "analysis_ok"  # type: ignore

    payload = {
        "dataset_name": "demo",
        "data": {
            "feature": [1, 0, 1, 0],
            "sensitive": [0, 0, 1, 1],
            "target": [1, 0, 1, 0],
        },
    }

    # Act
    r = client.post("/ai_core/analyze", json=payload)

    # Assert
    assert r.status_code == 200
    body = r.json()
    assert body["analysis_id"] == "analysis_ok"


# Cleanup: remove injected modules from sys.modules after tests complete
# to prevent test pollution where later tests get these fake modules
@pytest.fixture(scope="module", autouse=True)
def cleanup_sys_modules():
    """Remove fake modules from sys.modules after all tests in this module."""
    yield
    # After all tests, clean up the injected fake modules
    for mod_name in [
        "ai_core.utils.model_helper",
        "utils.model_helper",
        "ai_core.utils.persistence",
        "utils.persistence",
        "ai_core.utils.fairlens_helper",
        "utils.fairlens_helper",
        "ai_core.utils.dataset",
        "utils.dataset",
    ]:
        sys.modules.pop(mod_name, None)
