from fastapi import APIRouter
from ..v1 import schemas

router = APIRouter(prefix="/api/v1")


@router.post("/bias", response_model=schemas.BiasResponse)
def run_bias_check(payload: schemas.PredictionRequest):
    # Lightweight stub: returns dummy fairness metrics
    reports = [
        schemas.BiasReport(metric="demographic_parity", value=0.95),
        schemas.BiasReport(metric="equal_opportunity", value=0.92),
    ]
    return schemas.BiasResponse(reports=reports, overall_fairness_score=93.5)


@router.post("/explain", response_model=schemas.ExplainResponse)
def explain_prediction(payload: schemas.PredictionRequest):
    # Stub explanation: return feature contributions
    explanation = {k: 0.1 for k in payload.features.keys()}
    return schemas.ExplainResponse(explanation=explanation, expected_value=0.5)


@router.post("/audit", response_model=schemas.AuditResponse)
def generate_audit(payload: schemas.PredictionRequest):
    # Create a simple audit artifact (stub)
    return schemas.AuditResponse(audit_id="audit_001", status="created", artifacts=["report.json"])
