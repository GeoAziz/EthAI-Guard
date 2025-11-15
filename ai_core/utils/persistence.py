from pymongo import MongoClient
import os
from typing import Dict, Any


def get_db():
    mongo_url = os.getenv("MONGO_URL", "mongodb://mongo:27017/ethixai")
    client = MongoClient(mongo_url)
    return client["ethixai"]


def store_analysis(db, dataset_name: str, summary: Dict[str, Any]) -> str:
    coll = db["analyses"]
    doc = {"dataset_name": dataset_name, "summary": summary}
    res = coll.insert_one(doc)
    return str(res.inserted_id)


def get_shap_cache(db, model_hash: str, baseline_hash: str):
    coll = db["shap_cache"]
    q = {"model_hash": model_hash, "baseline_hash": baseline_hash}
    doc = coll.find_one(q)
    return doc


def set_shap_cache(db, model_hash: str, baseline_hash: str, shap_summary: Dict[str, float]):
    coll = db["shap_cache"]
    doc = {"model_hash": model_hash, "baseline_hash": baseline_hash, "shap_summary": shap_summary}
    coll.replace_one({"model_hash": model_hash, "baseline_hash": baseline_hash}, doc, upsert=True)
    return True
