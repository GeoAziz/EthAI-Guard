from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from ai_core.utils.fairlens_helper import run_fairness_stub
from ai_core.utils.persistence import get_db, store_analysis
from ai_core.utils.dataset import generate_bias_demo
from ai_core.utils.model_helper import train_quick_model, explain_model

router = APIRouter(prefix="/ai_core")


class AnalyzeRequest(BaseModel):
    dataset_name: str
    data: Dict[str, Any]


class AnalyzeResponse(BaseModel):
    analysis_id: str
    summary: Dict[str, float]


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    # For MVP: use a small synthetic dataset if no data provided, train a tiny model,
    # get explanation skeleton and compute simple fairness summary (stubbed).
    db = get_db()
    # If client provided data dictionary, try to convert to DataFrame-like structure.
    try:
        if req.data:
            # Expecting a mapping of column -> list-like; attempt to build DataFrame
            import pandas as pd

            X = pd.DataFrame(req.data)
            y = None
        else:
            X, y = generate_bias_demo()
    except Exception:
        X, y = generate_bias_demo()

    # If no target supplied, use synthetic labels
    if y is None:
        # For very small datasets, generate a larger demo for reliable labels
        # or create simple synthetic binary labels
        n_samples = len(X)
        if n_samples < 20:
            # Use full demo dataset instead
            X, y = generate_bias_demo(max(50, n_samples))
        else:
            _, y = generate_bias_demo(n_samples)

    model = train_quick_model(X, y)
    explanation = explain_model(model, X)

    # Compute a simple fairness summary (mock or simple parity check)
    summary = run_fairness_stub({"n_rows": len(X)})

    # Persist more detailed document with explanation (store small summary only)
    analysis_doc = {"dataset_name": req.dataset_name, "summary": summary, "explanation": explanation}
    analysis_id = store_analysis(db, req.dataset_name, analysis_doc)
    return AnalyzeResponse(analysis_id=analysis_id, summary=summary)
