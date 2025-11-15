import sys
import types
import pandas as pd
from typing import Any


def test_explain_model_uses_cache_when_present(monkeypatch):
    # inject a fake persistence module that returns a cached shap summary
    persist: Any = types.ModuleType("ai_core.utils.persistence")

    class FakeDB:
        pass

    cached_summary = {"a": 0.5, "b": 0.5}

    def get_db():
        return FakeDB()

    def get_shap_cache(db, mh, bh):
        return {"shap_summary": cached_summary}

    def set_shap_cache(db, mh, bh, summary):
        raise AssertionError("should not be called when cache present")

    persist.get_db = get_db
    persist.get_shap_cache = get_shap_cache
    persist.set_shap_cache = set_shap_cache

    sys.modules["ai_core.utils.persistence"] = persist

    # import under test
    from ai_core.utils.model_helper import explain_model

    model = object()  # any object, cache should short-circuit
    X = pd.DataFrame({"a": [1, 2], "b": [3, 4]})

    out = explain_model(model, X)
    assert out == cached_summary


def test_explain_model_writes_cache_on_miss(monkeypatch):
    # inject fake persistence that captures set_shap_cache
    persist: Any = types.ModuleType("ai_core.utils.persistence")

    class FakeColl:
        def __init__(self):
            self.replaced = None

        def replace_one(self, _filter, doc, upsert=False):
            self.replaced = doc

    class FakeDB:
        def __init__(self):
            self._coll = FakeColl()

        def get_collection(self, name):
            return self._coll

    fake_db = FakeDB()

    def get_db():
        return fake_db

    def get_shap_cache(db, mh, bh):
        return None

    def set_shap_cache(db, mh, bh, summary):
        coll = db.get_collection("shap_cache")
        coll.replace_one({"model_hash": mh, "baseline_hash": bh}, {"model_hash": mh, "baseline_hash": bh, "shap_summary": summary}, upsert=True)

    persist.get_db = get_db
    persist.get_shap_cache = get_shap_cache
    persist.set_shap_cache = set_shap_cache

    sys.modules["ai_core.utils.persistence"] = persist

    # use the train_quick_model to get a real pipeline with coefficients fallback
    from ai_core.utils.model_helper import train_quick_model, explain_model
    import pandas as pd

    X = pd.DataFrame({"f1": [0.1, 0.9, 0.2, 0.8], "f2": [1, 0, 1, 0]})
    y = pd.Series([0, 1, 0, 1])

    model = train_quick_model(X, y)
    summary = explain_model(model, X)

    # ensure cache was written
    coll = fake_db.get_collection("shap_cache")
    assert coll.replaced is not None
    assert "shap_summary" in coll.replaced
    assert isinstance(summary, dict)
