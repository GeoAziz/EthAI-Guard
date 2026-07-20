import logging
from typing import Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
import importlib

try:
    from ai_core.retraining import retrain_model, get_retraining_status, evaluate_model as eval_model
except ImportError:
    from retraining import retrain_model, get_retraining_status, evaluate_model as eval_model

logger = logging.getLogger('ai_core.routers.retraining')

router = APIRouter(prefix="/ai_core", tags=["retraining"])


class RetrainingRequest(BaseModel):
    job_id: str
    action: str
    dataset: Optional[Dict[str, Any]] = None
    config: Optional[Dict[str, Any]] = None


class ModelEvaluationRequest(BaseModel):
    job_id: str
    action: str
    model_version: str
    dataset: Optional[Dict[str, Any]] = None


class RetrainingResponse(BaseModel):
    job_id: str
    status: str
    model_version: Optional[str] = None
    model_hash: Optional[str] = None
    metrics: Optional[Dict[str, float]] = None
    duration_ms: Optional[int] = None
    recommended_for_production: Optional[bool] = None
    performance_score: Optional[float] = None
    fairness_score: Optional[float] = None
    error: Optional[str] = None


@router.post("/retrain", response_model=RetrainingResponse)
async def retrain(req: RetrainingRequest):
    try:
        if req.action != 'retrain_model':
            raise HTTPException(status_code=400, detail="Invalid action")

        if not req.dataset:
            raise HTTPException(status_code=400, detail="Dataset is required")

        try:
            ds_mod = importlib.import_module("ai_core.utils.dataset")
        except ImportError:
            ds_mod = importlib.import_module("utils.dataset")

        try:
            dataset_obj = req.dataset
            X_data = dataset_obj.get('X', [])
            y_data = dataset_obj.get('y', [])

            X_train = pd.DataFrame(X_data)
            y_train = pd.Series(y_data)

            split_idx = int(len(X_train) * 0.8)
            X_test = X_train[split_idx:]
            y_test = y_train[split_idx:]
            X_train = X_train[:split_idx]
            y_train = y_train[:split_idx]

            config = req.config or {}

            result = retrain_model(req.job_id, X_train, y_train, X_test, y_test, config)

            logger.info({'msg': 'retraining_completed', 'job_id': req.job_id, 'status': result['status']})

            return RetrainingResponse(
                job_id=req.job_id,
                status=result['status'],
                model_version=result.get('model_version'),
                model_hash=result.get('model_hash'),
                metrics=result.get('metrics'),
                duration_ms=result.get('duration_ms'),
                recommended_for_production=result.get('recommended_for_production'),
                performance_score=result.get('performance_score'),
                fairness_score=result.get('fairness_score'),
            )

        except Exception as e:
            logger.error({'err': str(e), 'msg': 'retraining_execution_failed', 'job_id': req.job_id})
            raise HTTPException(status_code=500, detail=str(e))

    except HTTPException:
        raise
    except Exception as e:
        logger.error({'err': str(e), 'msg': 'retraining_request_failed'})
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/evaluate")
async def evaluate(req: ModelEvaluationRequest):
    try:
        if req.action != 'evaluate_model':
            raise HTTPException(status_code=400, detail="Invalid action")

        status = get_retraining_status(req.job_id)

        if not status:
            raise HTTPException(status_code=404, detail=f"Job {req.job_id} not found")

        if status.get('status') != 'completed':
            return {
                'job_id': req.job_id,
                'status': status.get('status'),
                'stage': status.get('stage'),
                'progress': status.get('progress', 0),
                'error': status.get('error'),
            }

        result = status.get('result', {})

        logger.info({
            'msg': 'model_evaluation_retrieved',
            'job_id': req.job_id,
            'model_version': result.get('model_version'),
        })

        return {
            'job_id': req.job_id,
            'status': 'passed' if result.get('recommended_for_production') else 'failed',
            'model_version': result.get('model_version'),
            'model_hash': result.get('model_hash'),
            'metrics': result.get('metrics'),
            'fairness_violations': result.get('fairness_evaluation', {}).get('violations', {}),
            'performance_score': result.get('performance_score'),
            'fairness_score': result.get('fairness_score'),
            'recommended_for_production': result.get('recommended_for_production'),
            'promotion_reason': result.get('promotion_reason'),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error({'err': str(e), 'msg': 'model_evaluation_failed', 'job_id': req.job_id})
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/retrain/status/{job_id}")
async def get_status(job_id: str):
    try:
        status = get_retraining_status(job_id)

        if not status:
            raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

        return {
            'job_id': job_id,
            'status': status.get('status'),
            'stage': status.get('stage'),
            'progress': status.get('progress'),
            'error': status.get('error'),
            'result': status.get('result'),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error({'err': str(e), 'msg': 'failed_to_get_status', 'job_id': job_id})
        raise HTTPException(status_code=500, detail=str(e))
