import logging
import time
import numpy as np
import pandas as pd
from typing import Dict, Any, Optional, Tuple
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, classification_report
)

logger = logging.getLogger('ai_core.retraining.evaluation')

class ModelEvaluator:
    """
    Evaluates model performance on test datasets and compares with baseline.
    """

    def __init__(self):
        self.baseline_metrics = {}

    def evaluate_model(self, model, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, float]:
        try:
            start_time = time.time()

            y_pred = model.predict(X_test) if hasattr(model, 'predict') else None
            y_pred_proba = None

            if y_pred is None:
                raise ValueError('Model does not support prediction')

            metrics = {
                'accuracy': float(accuracy_score(y_test, y_pred)),
                'precision': float(precision_score(y_test, y_pred, average='weighted', zero_division=0)),
                'recall': float(recall_score(y_test, y_pred, average='weighted', zero_division=0)),
                'f1_score': float(f1_score(y_test, y_pred, average='weighted', zero_division=0)),
            }

            try:
                if hasattr(model, 'predict_proba'):
                    y_pred_proba = model.predict_proba(X_test)
                    if y_pred_proba.ndim > 1 and y_pred_proba.shape[1] > 1:
                        metrics['auc_roc'] = float(roc_auc_score(y_test, y_pred_proba[:, 1], multi_class='ovr'))
                else:
                    metrics['auc_roc'] = None
            except Exception:
                metrics['auc_roc'] = None

            duration = time.time() - start_time
            metrics['evaluation_duration_seconds'] = duration

            logger.info({
                'msg': 'model_evaluation_completed',
                'metrics': metrics,
                'duration_seconds': duration,
            })

            return metrics
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'model_evaluation_failed'})
            raise

    def evaluate_fairness(self, model, X_test: pd.DataFrame, y_test: pd.Series, sensitive_col: str = None) -> Dict[str, Any]:
        try:
            from ai_core.utils import fairness
        except Exception:
            try:
                from utils import fairness
            except Exception:
                logger.warn({'msg': 'fairness_module_not_available'})
                return {}

        try:
            y_pred = model.predict(X_test) if hasattr(model, 'predict') else None
            if y_pred is None:
                return {}

            if sensitive_col is None:
                for col in ('sensitive', 'protected', 'gender', 'sex', 'race'):
                    if col in X_test.columns:
                        sensitive_col = col
                        break

            if sensitive_col is None or sensitive_col not in X_test.columns:
                logger.warn({'msg': 'no_sensitive_column_found'})
                return {}

            metrics = fairness.compute_metrics(y_test, y_pred, X_test[sensitive_col])
            metrics['disparate_impact_ratio'] = float(
                fairness.disparate_impact_ratio(y_pred, X_test[sensitive_col])
            )

            violations = {}
            fairness_thresholds = {
                'demographic_parity_difference': 0.10,
                'equal_opportunity_difference': 0.10,
                'equalized_odds_difference': 0.10,
            }

            for metric_name, threshold in fairness_thresholds.items():
                value = metrics.get(metric_name)
                if value is not None and abs(value) > threshold:
                    violations[metric_name] = {
                        'value': float(value),
                        'threshold': threshold,
                    }

            if metrics.get('disparate_impact_ratio', 1.0) < 0.80:
                violations['disparate_impact_ratio'] = {
                    'value': float(metrics['disparate_impact_ratio']),
                    'threshold': 0.80,
                }

            logger.info({
                'msg': 'fairness_evaluation_completed',
                'violations': list(violations.keys()),
                'disparate_impact_ratio': metrics.get('disparate_impact_ratio'),
            })

            return {
                'metrics': metrics,
                'violations': violations,
                'has_violations': len(violations) > 0,
            }
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'fairness_evaluation_failed'})
            return {'error': str(e)}

    def compare_models(self, current_metrics: Dict[str, float], baseline_metrics: Dict[str, float]) -> Dict[str, Any]:
        try:
            comparison = {
                'performance_improvement': {},
                'performance_degradation': {},
                'overall_improvement': 0,
            }

            key_metrics = ['accuracy', 'precision', 'recall', 'f1_score']
            improvement_count = 0

            for metric in key_metrics:
                if metric in current_metrics and metric in baseline_metrics:
                    current = current_metrics[metric]
                    baseline = baseline_metrics[metric]
                    diff = current - baseline

                    if diff > 0.01:
                        comparison['performance_improvement'][metric] = float(diff)
                        improvement_count += 1
                    elif diff < -0.01:
                        comparison['performance_degradation'][metric] = float(abs(diff))

            comparison['overall_improvement'] = improvement_count / len(key_metrics)

            logger.info({
                'msg': 'model_comparison_completed',
                'improvements': len(comparison['performance_improvement']),
                'degradations': len(comparison['performance_degradation']),
            })

            return comparison
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'model_comparison_failed'})
            raise

    def should_promote_to_production(self, metrics: Dict[str, Any], fairness_eval: Dict[str, Any]) -> Tuple[bool, str]:
        try:
            reasons = []

            min_accuracy = 0.70
            if metrics.get('accuracy', 0) < min_accuracy:
                reasons.append(f'Accuracy {metrics.get("accuracy", 0):.2f} below threshold {min_accuracy}')

            min_f1 = 0.65
            if metrics.get('f1_score', 0) < min_f1:
                reasons.append(f'F1 Score {metrics.get("f1_score", 0):.2f} below threshold {min_f1}')

            if fairness_eval.get('has_violations', False):
                violations = fairness_eval.get('violations', {})
                reasons.append(f'Fairness violations detected: {list(violations.keys())}')

            if reasons:
                return False, '; '.join(reasons)

            return True, 'Model meets production criteria'
        except Exception as e:
            logger.error({'err': str(e), 'msg': 'failed_to_evaluate_production_readiness'})
            return False, f'Evaluation error: {str(e)}'


evaluator = ModelEvaluator()


def evaluate_model(model, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, float]:
    return evaluator.evaluate_model(model, X_test, y_test)


def evaluate_fairness(model, X_test: pd.DataFrame, y_test: pd.Series, sensitive_col: str = None) -> Dict[str, Any]:
    return evaluator.evaluate_fairness(model, X_test, y_test, sensitive_col)


def compare_models(current_metrics: Dict[str, float], baseline_metrics: Dict[str, float]) -> Dict[str, Any]:
    return evaluator.compare_models(current_metrics, baseline_metrics)


def should_promote_to_production(metrics: Dict[str, Any], fairness_eval: Dict[str, Any]) -> Tuple[bool, str]:
    return evaluator.should_promote_to_production(metrics, fairness_eval)
