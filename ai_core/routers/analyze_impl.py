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
    "equalized_odds_difference": 0.10,
    "average_absolute_odds_difference": 0.10,
}

# Ratio-style metrics violate when the value falls *below* the floor (e.g. the
# 80%/4-5ths rule), unlike the difference-style metrics above which violate
# when abs(value) exceeds a ceiling.
FAIRNESS_RATIO_FLOORS = {
    "disparate_impact_ratio": 0.80,
}

try:
    from prometheus_client import Histogram, Counter, Gauge

    ai_requests = Counter("ai_core_requests_total", "Total ai_core analyze requests", ["status"])
    ai_duration = Histogram("ai_core_analyze_seconds", "ai_core analyze duration seconds")
    ai_errors = Counter("ai_core_errors_total", "ai_core analyze errors")
    fairness_metrics_duration = Histogram("ai_core_fairness_metrics_seconds", "Fairness metrics computation duration in seconds", buckets=(0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0))

    # Fairness and bias metrics
    fairness_score = Gauge("fairness_score", "Fairness score (0-100) for analysis", ["dataset"])
    demographic_parity_difference = Gauge("demographic_parity_difference", "Demographic parity difference metric", ["protected_attribute"])
    equal_opportunity_difference = Gauge("equal_opportunity_difference", "Equal opportunity difference metric", ["protected_attribute"])
    equalized_odds_difference = Gauge("equalized_odds_difference", "Equalized odds difference metric", ["protected_attribute"])
    disparate_impact_ratio = Gauge("disparate_impact_ratio", "Disparate impact ratio (80/4-5ths rule)", ["protected_attribute"])
    bias_detected = Counter("bias_detected_total", "Number of analyses with fairness violations", ["violation_type"])
except Exception:
    ai_requests = ai_duration = ai_errors = fairness_metrics_duration = None
    fairness_score = demographic_parity_difference = equal_opportunity_difference = None
    equalized_odds_difference = disparate_impact_ratio = bias_detected = None

logger = logging.getLogger("ai_core.routers.analyze")


class AnalyzeRequest(BaseModel):
    dataset_name: str
    data: Dict[str, Any]
    protected_attribute: Optional[str] = None


class AnalyzeResponse(BaseModel):
    analysis_id: Optional[str]
    summary: Dict[str, Any]


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


def run_analysis_core(db, X, y, dataset_name: str, log_meta: Optional[Dict[str, Any]] = None, protected_attribute: Optional[str] = None) -> Tuple[Optional[str], Dict[str, Any]]:
    try:
        mh = importlib.import_module("ai_core.utils.model_helper")
    except Exception:
        mh = importlib.import_module("utils.model_helper")

    model = mh.train_quick_model(X, y)
    explanation = mh.explain_model(model, X)
    explanation_degraded = explanation.get("_degraded", False)

    summary: Dict[str, Any] = {"explanation_degraded": explanation_degraded}
    violations: Dict[str, Any] = {}

    try:
        y_pred = model.predict(X) if hasattr(model, "predict") else None
    except Exception as e:
        logger.error({"msg": "prediction_failed", "error": str(e), **(log_meta or {})})
        y_pred = None

    if y_pred is not None:
        sens_col = None

        if protected_attribute is not None:
            if protected_attribute in X.columns:
                sens_col = protected_attribute
            else:
                logger.warning({"msg": "specified_protected_attribute_not_found", "attribute": protected_attribute, "available_columns": list(X.columns), **(log_meta or {})})
        else:
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
                            logger.info({"msg": "auto_detected_protected_attribute", "attribute": sens_col, **(log_meta or {})})
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
                try:
                    start_fairness = time.time()
                    metrics = fairness_mod.compute_metrics(y, y_pred, X[sens_col])
                    metrics["disparate_impact_ratio"] = float(
                        fairness_mod.disparate_impact_ratio(y_pred, X[sens_col])
                    )
                    duration_fairness = time.time() - start_fairness
                    try:
                        if fairness_metrics_duration is not None:
                            fairness_metrics_duration.observe(duration_fairness)
                    except Exception:
                        pass
                    summary["fairness_metrics"] = metrics

                    # Record fairness metrics to Prometheus
                    try:
                        if fairness_score is not None:
                            # Calculate overall fairness score (0-100)
                            # Based on absence of violations
                            overall_score = 100
                            for k, thr in FAIRNESS_THRESHOLDS.items():
                                v = metrics.get(k)
                                if v is not None and abs(v) > thr:
                                    overall_score -= 10
                            fairness_score.labels(dataset=dataset_name).set(max(0, overall_score))

                        # Record individual metrics
                        if demographic_parity_difference is not None:
                            dpd = metrics.get("demographic_parity_difference")
                            if dpd is not None:
                                demographic_parity_difference.labels(protected_attribute=sens_col).set(float(dpd))

                        if equal_opportunity_difference is not None:
                            eod = metrics.get("equal_opportunity_difference")
                            if eod is not None:
                                equal_opportunity_difference.labels(protected_attribute=sens_col).set(float(eod))

                        if equalized_odds_difference is not None:
                            eodd = metrics.get("equalized_odds_difference")
                            if eodd is not None:
                                equalized_odds_difference.labels(protected_attribute=sens_col).set(float(eodd))

                        if disparate_impact_ratio is not None:
                            dir = metrics.get("disparate_impact_ratio")
                            if dir is not None:
                                disparate_impact_ratio.labels(protected_attribute=sens_col).set(float(dir))
                    except Exception as me:
                        logger.warning({"msg": "failed_to_record_metrics", "error": str(me)})

                    for k, thr in FAIRNESS_THRESHOLDS.items():
                        v = metrics.get(k)
                        if v is None:
                            continue
                        if abs(v) > thr:
                            violations[k] = {"value": float(v), "threshold": float(thr)}
                    for k, floor in FAIRNESS_RATIO_FLOORS.items():
                        v = metrics.get(k)
                        if v is None:
                            continue
                        if v < floor:
                            violations[k] = {"value": float(v), "threshold": float(floor)}

                    if violations:
                        summary["fairness_violations"] = violations
                        logger.info({"msg": "fairness_violations", "violations": violations, **(log_meta or {})})
                        # Record bias detection metric
                        try:
                            if bias_detected is not None:
                                for violation_type in violations.keys():
                                    bias_detected.labels(violation_type=violation_type).inc()
                        except Exception as be:
                            logger.warning({"msg": "failed_to_record_bias_metric", "error": str(be)})
                except Exception as e:
                    logger.error({"msg": "fairness_metric_computation_failed", "error": str(e), **(log_meta or {})})

    analysis_doc = {"dataset_name": dataset_name, "summary": summary, "explanation": explanation}
    aid = _call_store_analysis(db, dataset_name, analysis_doc)
    return aid, summary


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest, request: Request):  # type: ignore
    try:
        ds_mod = importlib.import_module("ai_core.utils.dataset")
    except Exception:
        ds_mod = importlib.import_module("utils.dataset")

    try:
        dv = importlib.import_module("ai_core.utils.data_validation")
    except Exception:
        dv = importlib.import_module("utils.data_validation")

    import pandas as pd

    if req.data:
        ok, msg = validate_dataset_mapping(req.data)
        if not ok:
            raise HTTPException(status_code=422, detail=f"Invalid data payload: {msg}")

        is_valid, msg = dv.validate_input_data(req.data)
        if not is_valid:
            raise HTTPException(status_code=422, detail=f"Data validation failed: {msg}")

        X = pd.DataFrame(req.data)
        y = X.pop("target") if "target" in X.columns else None

        is_valid, msg = dv.validate_dataframe(X, allow_target_only=True)
        if not is_valid:
            raise HTTPException(status_code=422, detail=f"DataFrame validation failed: {msg}")

        if y is not None:
            is_valid, msg = dv.validate_target_column(y)
            if not is_valid:
                raise HTTPException(status_code=422, detail=f"Target validation failed: {msg}")
    else:
        X, y = ds_mod.generate_bias_demo()

    aid, summary = run_analysis_core(None, X, y, req.dataset_name, {}, protected_attribute=req.protected_attribute)
    return AnalyzeResponse(analysis_id=aid, summary=summary)
