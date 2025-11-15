import pytest
import pandas as pd
import numpy as np
from fastapi import HTTPException

from ai_core.routers.analyze import run_analysis_core


class DummyModel:
    def __init__(self, pred):
        self._pred = np.array(pred)

    def predict(self, X):
        return self._pred


def test_run_analysis_core_raises_on_unfairness(monkeypatch):
    # Build a tiny dataset where sensitive column perfectly separates labels
    X = pd.DataFrame({
        "feat": [0, 1, 2, 3],
        "sensitive": [0, 0, 1, 1],
    })
    # True labels: first group all 0, second group all 1
    y = pd.Series([0, 0, 1, 1])

    # Monkeypatch model helper to return a model predicting the same as y
    def fake_train(X_in, y_in):
        return DummyModel(y)

    def fake_explain(model, X_in):
        # simple importance dict
        return {"feat": 0.5, "sensitive": 0.5}

    # Inject fake model_helper and persistence modules into sys.modules to avoid
    # importing heavy deps (shap/matplotlib) during test collection.
    import types, sys

    mh_mod = types.ModuleType("ai_core.utils.model_helper")
    mh_mod.train_quick_model = fake_train  # type: ignore
    mh_mod.explain_model = fake_explain  # type: ignore
    sys.modules["ai_core.utils.model_helper"] = mh_mod
    sys.modules["utils.model_helper"] = mh_mod

    # Monkeypatch persistence to avoid DB calls
    def fake_store(db, dataset_name, doc):
        return "test-id"
    persist_mod = types.ModuleType("ai_core.utils.persistence")
    persist_mod.store_analysis = fake_store  # type: ignore
    persist_mod.get_db = lambda: None  # type: ignore
    sys.modules["ai_core.utils.persistence"] = persist_mod
    sys.modules["utils.persistence"] = persist_mod

    # Inject a minimal fairlens helper used by run_analysis_core for summary
    ff_mod = types.ModuleType("ai_core.utils.fairlens_helper")
    ff_mod.run_fairness_stub = lambda meta: {"n_rows": int(meta.get("n_rows", 0))}  # type: ignore
    sys.modules["ai_core.utils.fairlens_helper"] = ff_mod
    sys.modules["utils.fairlens_helper"] = ff_mod

    # call run_analysis_core and expect HTTPException due to fairness violation
    with pytest.raises(HTTPException) as exc:
        run_analysis_core(db=None, X=X, y=y, dataset_name="tst", log_meta={})

    assert exc.value.status_code == 400
    assert "fairness_violation" in str(exc.value.detail)
