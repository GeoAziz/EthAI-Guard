import logging
import time
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, Optional, Tuple

try:
    from ai_core.utils import model_helper, dataset
    from ai_core.retraining.registry import ModelRegistry
    from ai_core.retraining.evaluation import (
        evaluate_model, evaluate_fairness, compare_models, should_promote_to_production
    )
except ImportError:
    from utils import model_helper, dataset
    from registry import ModelRegistry
    from evaluation import (
        evaluate_model, evaluate_fairness, compare_models, should_promote_to_production
    )

logger = logging.getLogger('ai_core.retraining.retraining')

_registry = ModelRegistry()
_retraining_status = {}


class RetrainingOrchestrator:
    def __init__(self, registry: ModelRegistry = None):
        self.registry = registry or _registry
        self.status = {}

    def start_retraining(self, job_id: str, X_train: pd.DataFrame, y_train: pd.Series,
                         X_test: pd.DataFrame, y_test: pd.Series,
                         config: Dict[str, Any] = None) -> Dict[str, Any]:
        start_time = time.time()
        self.status[job_id] = {
            'status': 'running',
            'stage': 'training',
            'start_time': start_time,
            'progress': 0,
        }

        try:
            logger.info({'msg': 'retraining_started', 'job_id': job_id})

            version = f'v{int(datetime.utcnow().timestamp())}'
            config = config or {}

            self.status[job_id]['stage'] = 'training'
            model = model_helper.train_quick_model(X_train, y_train)
            self.status[job_id]['progress'] = 33

            logger.info({'msg': 'model_trained', 'job_id': job_id, 'version': version})

            model_hash = self.registry.save_model_version(version, model, {
                'training_dataset_size': len(X_train),
                'test_dataset_size': len(X_test),
                'features': list(X_train.columns),
                'config': config,
            })

            self.status[job_id]['stage'] = 'evaluation'
            self.status[job_id]['progress'] = 66

            metrics = evaluate_model(model, X_test, y_test)
            fairness_eval = evaluate_fairness(model, X_test, y_test)

            self.status[job_id]['progress'] = 100
            self.status[job_id]['stage'] = 'completed'

            duration = time.time() - start_time

            result = {
                'job_id': job_id,
                'model_version': version,
                'model_hash': model_hash,
                'metrics': metrics,
                'fairness_evaluation': fairness_eval,
                'duration_ms': int((time.time() - start_time) * 1000),
                'status': 'completed',
            }

            promoted, reason = should_promote_to_production(metrics, fairness_eval)
            result['recommended_for_production'] = promoted
            result['promotion_reason'] = reason
            result['performance_score'] = metrics.get('f1_score', 0)
            result['fairness_score'] = 1.0 - (len(fairness_eval.get('violations', {})) / 4.0) if fairness_eval.get('violations') else 1.0

            self.status[job_id]['result'] = result
            self.status[job_id]['status'] = 'completed'

            logger.info({
                'msg': 'retraining_completed',
                'job_id': job_id,
                'version': version,
                'promoted': promoted,
                'duration_seconds': int(duration),
            })

            return result

        except Exception as e:
            logger.error({'err': str(e), 'msg': 'retraining_failed', 'job_id': job_id})
            self.status[job_id]['status'] = 'failed'
            self.status[job_id]['error'] = str(e)
            raise

    def rollback_to_version(self, version: str) -> bool:
        try:
            model = self.registry.load_model_version(version)
            metadata = self.registry.get_model_metadata(version)

            logger.info({'msg': 'model_rolled_back', 'version': version, 'metadata': metadata})
            return True
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'rollback_failed', 'version': version})
            return False

    def get_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        return self.status.get(job_id)

    def list_versions(self, limit: int = 50) -> list:
        return self.registry.list_model_versions(limit)


_orchestrator = RetrainingOrchestrator(_registry)


def retrain_model(job_id: str, X_train: pd.DataFrame, y_train: pd.Series,
                   X_test: pd.DataFrame, y_test: pd.Series,
                   config: Dict[str, Any] = None) -> Dict[str, Any]:
    return _orchestrator.start_retraining(job_id, X_train, y_train, X_test, y_test, config)


def get_retraining_status(job_id: str) -> Optional[Dict[str, Any]]:
    return _orchestrator.get_status(job_id)


def get_model_versions(limit: int = 50) -> list:
    return _orchestrator.list_versions(limit)


def rollback_to_version(version: str) -> bool:
    return _orchestrator.rollback_to_version(version)
