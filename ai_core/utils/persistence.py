import os
import time
import json
import hashlib
from typing import Any, Optional

try:
    from pymongo import MongoClient
except Exception:
    MongoClient = None  # optional dependency; tests may provide a fake DB


def get_db() -> Optional[Any]:
    """Return a pymongo Database object if MONGO_URI is configured and
    pymongo is available. Otherwise return None.

    Tests may monkeypatch this module with a fake DB object.
    """
    uri = os.environ.get("MONGO_URI") or os.environ.get("MONGO_URL")
    db_name = os.environ.get("MONGO_DB", "ai_core")
    if not uri or MongoClient is None:
        return None
    client = MongoClient(uri)
    return client[db_name]


def _collection(db: Any, name: str = "shap_cache"):
    # prefer the explicit get_collection API, but fall back to dict-style access
    if hasattr(db, "get_collection"):
        return db.get_collection(name)
    return db[name]


def get_shap_cache(db: Any, model_hash: str, baseline_hash: str) -> Optional[dict]:
    """Retrieve a cached SHAP summary document for the given model and baseline.

    Returns the stored document or None if not found. The returned dict will
    include keys: model_hash, baseline_hash, shap_summary, created_at.
    """
    if db is None:
        return None
    coll = _collection(db, "shap_cache")
    try:
        return coll.find_one({"model_hash": model_hash, "baseline_hash": baseline_hash})
    except Exception:
        # adapt to simple fake collection implementations used in tests
        try:
            return coll.find_one({"model_hash": model_hash, "baseline_hash": baseline_hash})
        except Exception:
            return None


def set_shap_cache(db: Any, model_hash: str, baseline_hash: str, shap_summary: dict) -> None:
    """Upsert a SHAP summary into the cache collection with a timestamp.

    Uses a simple upsert by model_hash+baseline_hash. If db is None this is a no-op.
    """
    if db is None:
        return
    coll = _collection(db, "shap_cache")
    now = int(time.time())
    doc = {"model_hash": model_hash, "baseline_hash": baseline_hash, "shap_summary": shap_summary, "created_at": now}
    try:
        if hasattr(coll, "replace_one"):
            coll.replace_one({"model_hash": model_hash, "baseline_hash": baseline_hash}, doc, upsert=True)
        elif hasattr(coll, "update_one"):
            coll.update_one({"model_hash": model_hash, "baseline_hash": baseline_hash}, {"$set": {"shap_summary": shap_summary, "created_at": now}}, upsert=True)
        else:
            # simple fake collection: try to set an attribute on a 'store' dict
            try:
                key = (model_hash, baseline_hash)
                coll.store = getattr(coll, "store", {})
                coll.store[key] = doc
            except Exception:
                pass
    except Exception:
        # swallow persistence errors
        return


def ensure_shap_cache_index(db: Any, ttl_seconds: int = 30 * 24 * 3600) -> None:
    """Ensure the `shap_cache` collection has an index on `created_at` with TTL.

    This is a no-op if db or collection doesn't expose `create_index` (e.g. a test fake).
    """
    if db is None:
        return
    coll = _collection(db, "shap_cache")
    try:
        if hasattr(coll, "create_index"):
            coll.create_index([("created_at", 1)], expireAfterSeconds=int(ttl_seconds))
    except Exception:
        # best-effort: don't raise on index creation failures
        return


def store_analysis(db: Any, dataset_name: str, analysis_doc: dict) -> str:
    """Persist analysis document and return an analysis_id.

    If db is None, produce a deterministic id (sha256 of doc+time). If the DB
    supports insert_one, use it and return the inserted id as string where
    possible. This is a best-effort helper designed to work with test fakes.
    """
    now = int(time.time())
    doc = dict(analysis_doc)
    doc.setdefault("dataset_name", dataset_name)
    doc.setdefault("created_at", now)

    if db is None:
        payload = json.dumps(doc, sort_keys=True, default=str) + str(now)
        return hashlib.sha256(payload.encode()).hexdigest()

    coll = _collection(db, "analyses")
    try:
        if hasattr(coll, "insert_one"):
            res = coll.insert_one(doc)
            try:
                return str(res.inserted_id)
            except Exception:
                return hashlib.sha256(json.dumps(doc, sort_keys=True).encode()).hexdigest()
        else:
            try:
                key = hashlib.sha256(json.dumps(doc, sort_keys=True).encode()).hexdigest()
                coll.store = getattr(coll, "store", {})
                coll.store[key] = doc
                return key
            except Exception:
                return hashlib.sha256(json.dumps(doc, sort_keys=True).encode()).hexdigest()
    except Exception:
        return hashlib.sha256(json.dumps(doc, sort_keys=True).encode()).hexdigest()
