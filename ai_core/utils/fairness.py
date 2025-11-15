from typing import Sequence, Dict, Union
import numpy as np


def _as_array(x):
    return np.asarray(x)


def demographic_parity_difference(y_pred: Union[Sequence, np.ndarray], sensitive: Union[Sequence, np.ndarray]) -> float:
    """Compute demographic parity difference: P(y_pred=1 | S=1) - P(y_pred=1 | S=0).

    Assumes binary sensitive values (truthy=1, falsy=0). Returns float in [-1,1].
    """
    y = _as_array(y_pred)
    s = _as_array(sensitive)
    mask1 = s.astype(bool)
    if mask1.sum() == 0 or (~mask1).sum() == 0:
        return 0.0
    p1 = float((y[mask1] == 1).mean())
    p0 = float((y[~mask1] == 1).mean())
    return p1 - p0


def equal_opportunity_difference(y_true: Union[Sequence, np.ndarray], y_pred: Union[Sequence, np.ndarray], sensitive: Union[Sequence, np.ndarray]) -> float:
    """Compute equal opportunity difference: TPR(S=1) - TPR(S=0).

    TPR = TP / (TP + FN) computed per group.
    """
    y = _as_array(y_true)
    yhat = _as_array(y_pred)
    s = _as_array(sensitive)
    def tpr_for(mask):
        pos_mask = (y == 1) & mask
        if pos_mask.sum() == 0:
            return 0.0
        tp = int(((yhat == 1) & pos_mask).sum())
        return float(tp) / float(pos_mask.sum())

    mask1 = s.astype(bool)
    tpr1 = tpr_for(mask1)
    tpr0 = tpr_for(~mask1)
    return tpr1 - tpr0


def compute_metrics(y_true: Union[Sequence, np.ndarray], y_pred: Union[Sequence, np.ndarray], sensitive: Union[Sequence, np.ndarray]) -> Dict[str, float]:
    return {
        "demographic_parity_difference": float(demographic_parity_difference(y_pred, sensitive)),
        "equal_opportunity_difference": float(equal_opportunity_difference(y_true, y_pred, sensitive)),
    }


def validate_against_thresholds(metrics: Dict[str, float], thresholds: Dict[str, float]):
    """Return dict of metric->(value, threshold) entries for violations."""
    violations = {}
    for k, thr in thresholds.items():
        val = metrics.get(k)
        if val is None:
            continue
        if abs(val) > thr:
            violations[k] = {"value": float(val), "threshold": float(thr)}
    return violations
