import time
from ai_core.utils import persistence


class FakeCollection:
    def __init__(self):
        self.store = {}

    def find_one(self, query):
        key = (query.get("model_hash"), query.get("baseline_hash"))
        return self.store.get(key)

    def update_one(self, _filter, update, upsert=False):
        key = (_filter.get("model_hash"), _filter.get("baseline_hash"))
        val = self.store.get(key, {})
        # emulate $set
        s = update.get("$set", {})
        val.update(s)
        val.update({"model_hash": _filter.get("model_hash"), "baseline_hash": _filter.get("baseline_hash")})
        self.store[key] = val


class FakeDB:
    def __init__(self):
        self._coll = FakeCollection()

    def get_collection(self, name):
        return self._coll


def test_set_and_get_shap_cache_roundtrip():
    db = FakeDB()
    model_hash = "mh_test"
    baseline_hash = "bh_test"
    summary = {"f1": 0.5, "f2": 0.25}

    # initially nothing
    assert persistence.get_shap_cache(db, model_hash, baseline_hash) is None

    persistence.set_shap_cache(db, model_hash, baseline_hash, summary)

    got = persistence.get_shap_cache(db, model_hash, baseline_hash)
    assert got is not None
    assert got["shap_summary"] == summary
    assert got["model_hash"] == model_hash
    assert got["baseline_hash"] == baseline_hash
    assert "created_at" in got


def test_noop_when_db_none():
    # should not raise
    persistence.set_shap_cache(None, "m", "b", {"x": 1})
    assert persistence.get_shap_cache(None, "m", "b") is None
