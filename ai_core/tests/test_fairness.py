import numpy as np
import pytest

from ai_core.utils.fairness import (
    compute_metrics,
    compute_all_metrics,
    demographic_parity_difference,
    equal_opportunity_difference,
    equalized_odds_difference,
    average_absolute_odds_difference,
    disparate_impact_ratio,
    calibration_within_groups,
    individual_fairness_consistency,
    counterfactual_fairness_score,
    intersectional_demographic_parity,
    validate_against_thresholds,
    validate_ratio_floors,
    registry,
)


# ---------------------------------------------------------------------------
# Existing metrics (regression coverage)
# ---------------------------------------------------------------------------

def test_demographic_parity_zero_when_equal():
    yhat = np.array([1, 0, 1, 0])
    s = np.array([0, 0, 1, 1])
    dpd = demographic_parity_difference(yhat, s)
    assert abs(dpd) < 1e-6


def test_demographic_parity_detects_difference():
    yhat = np.array([1, 1, 1, 0, 0, 0])
    s = np.array([1, 1, 1, 0, 0, 0])
    dpd = demographic_parity_difference(yhat, s)
    assert dpd > 0


def test_demographic_parity_empty_group_returns_zero():
    yhat = np.array([1, 0, 1, 0])
    s = np.array([1, 1, 1, 1])
    assert demographic_parity_difference(yhat, s) == 0.0


def test_equal_opportunity_difference():
    y = np.array([1, 1, 1, 1])
    yhat = np.array([1, 1, 0, 0])
    s = np.array([0, 0, 1, 1])
    eod = equal_opportunity_difference(y, yhat, s)
    assert eod < 0


def test_equal_opportunity_no_positives_in_group_returns_zero():
    y = np.array([0, 0, 1, 1])
    yhat = np.array([0, 0, 1, 0])
    s = np.array([0, 0, 1, 1])
    # group 0 has no actual positives -> tpr defined as 0.0, no crash
    eod = equal_opportunity_difference(y, yhat, s)
    assert isinstance(eod, float)


def test_validate_against_thresholds():
    metrics = {"demographic_parity_difference": 0.2}
    thr = {"demographic_parity_difference": 0.1}
    v = validate_against_thresholds(metrics, thr)
    assert "demographic_parity_difference" in v


def test_validate_against_thresholds_no_violation():
    metrics = {"demographic_parity_difference": 0.05}
    thr = {"demographic_parity_difference": 0.1}
    v = validate_against_thresholds(metrics, thr)
    assert v == {}


# ---------------------------------------------------------------------------
# Equalized odds / average absolute odds
# ---------------------------------------------------------------------------

def test_equalized_odds_zero_when_rates_match():
    y = np.array([1, 0, 1, 0, 1, 0, 1, 0])
    yhat = np.array([1, 0, 1, 0, 1, 0, 1, 0])
    s = np.array([0, 0, 0, 0, 1, 1, 1, 1])
    assert abs(equalized_odds_difference(y, yhat, s)) < 1e-6
    assert abs(average_absolute_odds_difference(y, yhat, s)) < 1e-6


def test_equalized_odds_detects_tpr_gap():
    # group 0: perfect TPR/FPR; group 1: all predicted negative -> TPR drops
    y = np.array([1, 1, 0, 0, 1, 1, 0, 0])
    yhat = np.array([1, 1, 0, 0, 0, 0, 0, 0])
    s = np.array([0, 0, 0, 0, 1, 1, 1, 1])
    eod = equalized_odds_difference(y, yhat, s)
    aaod = average_absolute_odds_difference(y, yhat, s)
    assert eod > 0
    assert aaod > 0
    # equalized odds (max) should be >= average absolute odds (mean) of the same two gaps
    assert eod >= aaod - 1e-9


def test_equalized_odds_empty_group_no_crash():
    # s has only one real group; the other side of every mask is empty, so the
    # implementation's default TPR/FPR of 0.0 for an empty group is expected
    # to surface as a (non-crashing) gap rather than silently returning 0.
    y = np.array([1, 0, 1, 0])
    yhat = np.array([1, 0, 1, 0])
    s = np.array([1, 1, 1, 1])
    assert equalized_odds_difference(y, yhat, s) == 1.0
    assert average_absolute_odds_difference(y, yhat, s) == 0.5


# ---------------------------------------------------------------------------
# Disparate impact ratio
# ---------------------------------------------------------------------------

def test_disparate_impact_ratio_perfect_parity():
    yhat = np.array([1, 0, 1, 0])
    s = np.array([0, 0, 1, 1])
    assert abs(disparate_impact_ratio(yhat, s) - 1.0) < 1e-6


def test_disparate_impact_ratio_detects_violation():
    # group 1 selected 100% of time, group 0 selected 20% of time -> ratio 0.2
    yhat = np.array([1, 0, 0, 0, 0, 1, 1, 1, 1, 1])
    s = np.array([0, 0, 0, 0, 0, 1, 1, 1, 1, 1])
    ratio = disparate_impact_ratio(yhat, s)
    assert ratio < 0.8
    assert ratio == pytest.approx(0.2, abs=1e-6)


def test_disparate_impact_ratio_multi_group():
    yhat = np.array([1, 1, 1, 1, 0, 0, 0, 0, 1, 0])
    s = np.array([0, 0, 0, 0, 1, 1, 1, 1, 2, 2])
    ratio = disparate_impact_ratio(yhat, s)
    assert 0.0 <= ratio <= 1.0


def test_disparate_impact_ratio_single_group_returns_one():
    yhat = np.array([1, 0, 1, 0])
    s = np.array([0, 0, 0, 0])
    assert disparate_impact_ratio(yhat, s) == 1.0


def test_disparate_impact_ratio_all_zero_selection_returns_one():
    yhat = np.array([0, 0, 0, 0])
    s = np.array([0, 0, 1, 1])
    assert disparate_impact_ratio(yhat, s) == 1.0


def test_validate_ratio_floors_detects_violation():
    metrics = {"disparate_impact_ratio": 0.6}
    floors = {"disparate_impact_ratio": 0.8}
    v = validate_ratio_floors(metrics, floors)
    assert "disparate_impact_ratio" in v
    assert v["disparate_impact_ratio"]["value"] == 0.6


def test_validate_ratio_floors_no_violation_above_floor():
    metrics = {"disparate_impact_ratio": 0.9}
    floors = {"disparate_impact_ratio": 0.8}
    assert validate_ratio_floors(metrics, floors) == {}


# ---------------------------------------------------------------------------
# Calibration within groups
# ---------------------------------------------------------------------------

def test_calibration_perfect_calibration_near_zero_ece():
    rng = np.random.default_rng(0)
    n = 2000
    p = rng.uniform(0, 1, n)
    y = (rng.uniform(0, 1, n) < p).astype(int)
    s = np.array([0, 1] * (n // 2))
    result = calibration_within_groups(y, p, s, n_bins=10)
    assert result["group_0"] < 0.1
    assert result["group_1"] < 0.1
    assert result["max_group_diff"] < 0.1


def test_calibration_detects_miscalibration():
    # group 1 predictions are systematically overconfident vs actual outcomes
    n = 200
    p = np.concatenate([np.full(n, 0.5), np.full(n, 0.9)])
    y = np.concatenate([
        (np.arange(n) % 2),          # ~50% positive, matches p=0.5
        np.zeros(n, dtype=int),       # 0% positive, but p=0.9 -> miscalibrated
    ])
    s = np.concatenate([np.zeros(n, dtype=int), np.ones(n, dtype=int)])
    result = calibration_within_groups(y, p, s, n_bins=10)
    assert result["group_1"] > result["group_0"]
    assert result["max_group_diff"] > 0.5


def test_calibration_empty_input_no_crash():
    result = calibration_within_groups(np.array([]), np.array([]), np.array([]))
    assert result["max_group_diff"] == 0.0


# ---------------------------------------------------------------------------
# Individual fairness consistency
# ---------------------------------------------------------------------------

def test_individual_fairness_perfect_consistency():
    X = np.array([[0.0], [0.01], [1.0], [1.01]])
    y_pred = np.array([0.0, 0.0, 1.0, 1.0])
    score = individual_fairness_consistency(X, y_pred, k=1)
    assert score > 0.95


def test_individual_fairness_detects_inconsistency():
    # near-identical features but wildly different predictions
    X = np.array([[0.0], [0.01], [0.02], [0.03]])
    y_pred = np.array([0.0, 1.0, 0.0, 1.0])
    score = individual_fairness_consistency(X, y_pred, k=1)
    assert score < 0.5


def test_individual_fairness_single_sample_returns_one():
    X = np.array([[1.0]])
    y_pred = np.array([1.0])
    assert individual_fairness_consistency(X, y_pred) == 1.0


# ---------------------------------------------------------------------------
# Counterfactual fairness
# ---------------------------------------------------------------------------

def test_counterfactual_fairness_zero_when_invariant():
    factual = np.array([1, 0, 1, 0])
    counterfactual = np.array([1, 0, 1, 0])
    assert counterfactual_fairness_score(factual, counterfactual) == 0.0


def test_counterfactual_fairness_detects_flip():
    factual = np.array([1, 0, 1, 0])
    counterfactual = np.array([0, 0, 1, 1])
    score = counterfactual_fairness_score(factual, counterfactual)
    assert score == pytest.approx(0.5)


def test_counterfactual_fairness_empty_returns_zero():
    assert counterfactual_fairness_score(np.array([]), np.array([])) == 0.0


def test_counterfactual_fairness_shape_mismatch_returns_zero():
    assert counterfactual_fairness_score(np.array([1, 0]), np.array([1, 0, 1])) == 0.0


# ---------------------------------------------------------------------------
# Intersectional fairness
# ---------------------------------------------------------------------------

def test_intersectional_demographic_parity_zero_when_balanced():
    # Each of the 4 (gender, race) intersectional groups has an identical 50%
    # positive rate, so the gap across groups should be zero.
    yhat = np.array([1, 0, 1, 0, 1, 0, 1, 0])
    gender = np.array([0, 0, 0, 0, 1, 1, 1, 1])
    race = np.array([0, 0, 1, 1, 0, 0, 1, 1])
    gap = intersectional_demographic_parity(yhat, [gender, race])
    assert gap == pytest.approx(0.0, abs=1e-6)


def test_intersectional_demographic_parity_detects_gap():
    # (gender=1, race=1) group always selected; (gender=0, race=0) never selected
    yhat = np.array([1, 1, 1, 1, 0, 0, 0, 0])
    gender = np.array([1, 1, 1, 1, 0, 0, 0, 0])
    race = np.array([1, 1, 1, 1, 0, 0, 0, 0])
    gap = intersectional_demographic_parity(yhat, [gender, race])
    assert gap == pytest.approx(1.0)


def test_intersectional_demographic_parity_single_group_returns_zero():
    yhat = np.array([1, 0, 1, 0])
    gender = np.array([0, 0, 0, 0])
    race = np.array([0, 0, 0, 0])
    assert intersectional_demographic_parity(yhat, [gender, race]) == 0.0


# ---------------------------------------------------------------------------
# compute_metrics / compute_all_metrics / registry
# ---------------------------------------------------------------------------

def test_compute_metrics_backward_compatible_keys_present():
    y = np.array([1, 1, 0, 0])
    yhat = np.array([1, 0, 0, 0])
    s = np.array([0, 0, 1, 1])
    metrics = compute_metrics(y, yhat, s)
    assert "demographic_parity_difference" in metrics
    assert "equal_opportunity_difference" in metrics
    assert "equalized_odds_difference" in metrics
    assert "average_absolute_odds_difference" in metrics


def test_registry_lists_all_metrics():
    names = registry.list_metrics()
    for expected in [
        "demographic_parity_difference",
        "equal_opportunity_difference",
        "equalized_odds_difference",
        "average_absolute_odds_difference",
        "disparate_impact_ratio",
        "calibration_within_groups",
        "individual_fairness_consistency",
        "counterfactual_fairness_score",
        "intersectional_demographic_parity",
    ]:
        assert expected in names


def test_compute_all_metrics_only_computes_available():
    y = np.array([1, 1, 0, 0])
    yhat = np.array([1, 0, 0, 0])
    s = np.array([0, 0, 1, 1])
    # Only supply y_true/y_pred/sensitive -> metrics needing X, y_prob, etc. skipped
    result = compute_all_metrics(y_true=y, y_pred=yhat, sensitive=s)
    assert "demographic_parity_difference" in result
    assert "equal_opportunity_difference" in result
    assert "calibration_within_groups" not in result
    assert "individual_fairness_consistency" not in result


def test_compute_all_metrics_includes_calibration_when_prob_supplied():
    y = np.array([1, 1, 0, 0])
    yhat = np.array([1, 0, 0, 0])
    s = np.array([0, 0, 1, 1])
    p = np.array([0.9, 0.4, 0.2, 0.3])
    result = compute_all_metrics(y_true=y, y_pred=yhat, sensitive=s, y_prob=p)
    assert "calibration_within_groups" in result


def test_compute_all_metrics_includes_individual_fairness_when_X_supplied():
    X = np.array([[0.0], [0.1], [1.0], [1.1]])
    yhat = np.array([0, 0, 1, 1])
    result = compute_all_metrics(X=X, y_pred=yhat)
    assert "individual_fairness_consistency" in result
