from pydantic import BaseModel
from typing import Dict, Any


class Analysis(BaseModel):
    id: str
    dataset_name: str
    metrics: Dict[str, float]
