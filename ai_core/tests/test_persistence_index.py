import types
from ai_core.utils import persistence


class FakeColl:
    def __init__(self):
        self.indexes = []

    def create_index(self, keys, **kwargs):
        self.indexes.append((tuple(keys), kwargs))


class FakeDB:
    def __init__(self):
        self._coll = FakeColl()

    def get_collection(self, name):
        return self._coll


def test_ensure_shap_cache_index_calls_create_index():
    db = FakeDB()
    persistence.ensure_shap_cache_index(db, ttl_seconds=3600)
    coll = db.get_collection("shap_cache")
    assert len(coll.indexes) == 1
    keys, kwargs = coll.indexes[0]
    assert keys == (("created_at", 1),)
    assert "expireAfterSeconds" in kwargs
