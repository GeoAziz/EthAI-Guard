from pydantic import BaseModel
from typing import List, Dict, Any, Optional


class PredictionRequest(BaseModel):
    features: Dict[str, Any]
    model_id: Optional[str] = None


class BiasReport(BaseModel):
    metric: str
    value: float
    details: Optional[Dict[str, Any]] = None


class BiasResponse(BaseModel):
    reports: List[BiasReport]
    overall_fairness_score: float


class ExplainResponse(BaseModel):
    explanation: Dict[str, float]
    expected_value: Optional[float] = None


class AuditResponse(BaseModel):
    audit_id: str
    status: str
    artifacts: Optional[List[str]] = None
