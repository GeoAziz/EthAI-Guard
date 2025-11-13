from pymongo import MongoClient
import os
from typing import Dict, Any


def get_db():
    mongo_url = os.getenv("MONGO_URL", "mongodb://mongo:27017/ethixai")
    client = MongoClient(mongo_url)
    return client['ethixai']


def store_analysis(db, dataset_name: str, summary: Dict[str, Any]) -> str:
    coll = db['analyses']
    doc = {"dataset_name": dataset_name, "summary": summary}
    res = coll.insert_one(doc)
    return str(res.inserted_id)
