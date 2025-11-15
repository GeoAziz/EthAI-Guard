"""Implementation for analyze router kept separate so `analyze.py` can be a
small shim. This helps atomic replace when the router was corrupted.
"""
from __future__ import annotations
from typing import Any, Dict, Optional, Tuple
import importlib
import logging
import time
import io
import base64
import json

try:
    from fastapi import APIRouter, Request, HTTPException  # type: ignore
except Exception:  # lightweight fallback for test collectors
    class APIRouter:  # type: ignore
        def __init__(self, *a, **k):
            pass

        def post(self, *a, **k):
            def _d(f):
                return f

            return _d

    class Request:  # type: ignore
        headers: Dict[str, str]

        def __init__(self):
            self.headers = {}

    class HTTPException(Exception):  # type: ignore
        def __init__(self, status_code: int = 500, detail: Optional[Any] = None):
            super().__init__(detail)

try:
    from pydantic import BaseModel as PydanticBaseModel
    BaseModel = PydanticBaseModel  # type: ignore
except Exception:
    class BaseModel:  # type: ignore
        def __init__(self, **kwargs):
            for k, v in kwargs.items():
                setattr(self, k, v)

router = APIRouter(prefix="/ai_core")

def validate_dataset_mapping(data: Dict[str, Any]) -> Tuple[bool, str]:
    return True, ""

evaluate_data_quality = None

FAIRNESS_THRESHOLDS = {
    "demographic_parity_difference": 0.10,
    "equal_opportunity_difference": 0.10,
}

try:
    from prometheus_client import Histogram, Counter

    ai_requests = Counter("ai_core_requests_total", "Total ai_core analyze requests", ["status"]) 
    ai_duration = Histogram("ai_core_analyze_seconds", "ai_core analyze duration seconds")
    ai_errors = Counter("ai_core_errors_total", "ai_core analyze errors")
except Exception:
    ai_requests = ai_duration = ai_errors = None

logger = logging.getLogger("ai_core.routers.analyze")


class AnalyzeRequest(BaseModel):
    dataset_name: str
    data: Dict[str, Any]


class AnalyzeResponse(BaseModel):
    analysis_id: Optional[str]
    summary: Dict[str, float]


def _call_store_analysis(db, dataset_name: str, doc: Dict[str, Any]) -> Optional[str]:
    aid = None
    try:
        # First try to use store_analysis from the analyze module (allows test monkeypatching)
        try:
            analyze_mod = importlib.import_module("ai_core.routers.analyze")
        except Exception:
            analyze_mod = importlib.import_module("routers.analyze")
        
        if hasattr(analyze_mod, "store_analysis"):
            aid = analyze_mod.store_analysis(db, dataset_name, doc)
            if aid is not None:
                return aid
    except Exception:
        pass
    
    # Fallback to persistence module
    try:
        try:
            p = importlib.import_module("ai_core.utils.persistence")
        except Exception:
            p = importlib.import_module("utils.persistence")
        if hasattr(p, "store_analysis"):
            aid = p.store_analysis(db, dataset_name, doc)
    except Exception:
        aid = None
    return aid


def run_analysis_core(db, X, y, dataset_name: str, log_meta: Optional[Dict[str, Any]] = None) -> Tuple[Optional[str], Dict[str, float]]:
    try:
        mh = importlib.import_module("ai_core.utils.model_helper")
    except Exception:
        mh = importlib.import_module("utils.model_helper")

    model = mh.train_quick_model(X, y)
    explanation = mh.explain_model(model, X)

    try:
        y_pred = model.predict(X) if hasattr(model, "predict") else None
    except Exception:
        y_pred = None

    if y_pred is not None:
        sens_col = None
        for c in ("sensitive", "protected", "gender", "sex", "race"):
            if c in X.columns:
                sens_col = c
                break
        if sens_col is None:
            for c in X.columns:
                if c == "target":
                    continue
                try:
                    if X[c].nunique(dropna=True) == 2:
                        sens_col = c
                        break
                except Exception:
                    continue

        if sens_col is not None:
            try:
                try:
                    fairness_mod = importlib.import_module("ai_core.utils.fairness")
                except Exception:
                    fairness_mod = importlib.import_module("utils.fairness")
            except Exception:
                fairness_mod = None

            if fairness_mod is not None:
                metrics = fairness_mod.compute_metrics(y, y_pred, X[sens_col])
                violations = {}
                for k, thr in FAIRNESS_THRESHOLDS.items():
                    v = metrics.get(k)
                    if v is None:
                        continue
                    if abs(v) > thr:
                        violations[k] = {"value": float(v), "threshold": float(thr)}
                if violations:
                    logger.info({"msg": "fairness_violations", "violations": violations, **(log_meta or {})})
                    raise HTTPException(status_code=400, detail={"msg": "fairness_violation", "violations": violations})

    analysis_doc = {"dataset_name": dataset_name, "summary": {}, "explanation": explanation}
    aid = _call_store_analysis(db, dataset_name, analysis_doc)
    return aid, analysis_doc.get("summary", {})


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest, request: Request):  # type: ignore
    try:
        ds_mod = importlib.import_module("ai_core.utils.dataset")
    except Exception:
        ds_mod = importlib.import_module("utils.dataset")

    import pandas as pd
    
    MAX_ROWS = 100000
    
    if req.data:
        ok, msg = validate_dataset_mapping(req.data)
        if not ok:
            raise HTTPException(status_code=400, detail=f"Invalid data payload: {msg}")
        
        # Check for mismatched column lengths
        if req.data:
            col_lengths = {col: len(values) for col, values in req.data.items()}
            lengths = set(col_lengths.values())
            if len(lengths) > 1:
                raise HTTPException(status_code=400, detail=f"Mismatched column lengths: {col_lengths}")
            
            # Check for oversized payloads
            max_len = max(col_lengths.values()) if col_lengths else 0
            if max_len > MAX_ROWS:
                raise HTTPException(status_code=400, detail=f"Dataset exceeds maximum rows ({MAX_ROWS}): {max_len} rows provided")
        
        X = pd.DataFrame(req.data)
        y = X.pop("target") if "target" in X.columns else None
    else:
        X, y = ds_mod.generate_bias_demo()

    aid, summary = run_analysis_core(None, X, y, req.dataset_name, {})
    return AnalyzeResponse(analysis_id=aid, summary=summary)
