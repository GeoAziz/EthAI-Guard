import numpy as np

from ai_core.utils.fairness import compute_metrics, demographic_parity_difference, equal_opportunity_difference, validate_against_thresholds


def test_demographic_parity_zero_when_equal():
    yhat = np.array([1, 0, 1, 0])
    s = np.array([0, 0, 1, 1])
    dpd = demographic_parity_difference(yhat, s)
    assert abs(dpd) < 1e-6


def test_demographic_parity_detects_difference():
    # group 1 has higher positive rate
    yhat = np.array([1, 1, 1, 0, 0, 0])
    s = np.array([1, 1, 1, 0, 0, 0])
    dpd = demographic_parity_difference(yhat, s)
    assert dpd > 0


def test_equal_opportunity_difference():
    # group 0 has TPR 1.0, group 1 has TPR 0.0
    y = np.array([1, 1, 1, 1])
    yhat = np.array([1, 1, 0, 0])
    s = np.array([0, 0, 1, 1])
    eod = equal_opportunity_difference(y, yhat, s)
    assert eod < 0


def test_validate_against_thresholds():
    metrics = {"demographic_parity_difference": 0.2}
    thr = {"demographic_parity_difference": 0.1}
    v = validate_against_thresholds(metrics, thr)
    assert "demographic_parity_difference" in v
