"""Tests for advanced drift detection: multivariate drift, anomaly detection, causal drift."""
import numpy as np
import pytest

from ai_core.drift.advanced import (
    compute_multivariate_drift,
    detect_anomalies_isolation_forest,
    detect_anomalies_lof,
    compute_causal_drift,
)


def _make_gaussian(n, n_features, mean, seed):
    rng = np.random.RandomState(seed)
    return rng.normal(loc=mean, scale=1.0, size=(n, n_features))


class TestMultivariateDrift:
    def test_no_drift_when_same_distribution(self):
        baseline = _make_gaussian(200, 3, mean=0.0, seed=1)
        current = _make_gaussian(200, 3, mean=0.0, seed=2)

        result = compute_multivariate_drift(baseline, current)

        assert 'error' not in result
        assert result['severity'] == 'stable'
        assert result['classifier_auc'] < 0.65

    def test_drift_detected_on_mean_shift(self):
        baseline = _make_gaussian(200, 3, mean=0.0, seed=1)
        current = _make_gaussian(200, 3, mean=5.0, seed=2)

        result = compute_multivariate_drift(baseline, current)

        assert result['severity'] == 'critical'
        assert result['mahalanobis_distance'] > 3.0
        assert result['classifier_auc'] > 0.9

    def test_insufficient_samples(self):
        result = compute_multivariate_drift(np.array([[1.0]]), np.array([[1.0]]))
        assert 'error' in result

    def test_dimension_mismatch(self):
        baseline = _make_gaussian(50, 3, mean=0.0, seed=1)
        current = _make_gaussian(50, 2, mean=0.0, seed=2)
        result = compute_multivariate_drift(baseline, current)
        assert 'error' in result


class TestAnomalyDetection:
    def test_isolation_forest_flags_injected_outliers(self):
        rng = np.random.RandomState(0)
        normal = rng.normal(loc=0.0, scale=1.0, size=(190, 4))
        outliers = rng.normal(loc=50.0, scale=1.0, size=(10, 4))
        data = np.vstack([normal, outliers])

        result = detect_anomalies_isolation_forest(data, contamination=0.05)

        assert 'error' not in result
        assert result['anomaly_count'] > 0
        assert 0 <= result['anomaly_rate'] <= 1

    def test_isolation_forest_insufficient_samples(self):
        result = detect_anomalies_isolation_forest(np.zeros((5, 2)))
        assert 'error' in result

    def test_lof_flags_injected_outliers(self):
        rng = np.random.RandomState(0)
        normal = rng.normal(loc=0.0, scale=1.0, size=(190, 4))
        outliers = rng.normal(loc=50.0, scale=1.0, size=(10, 4))
        data = np.vstack([normal, outliers])

        result = detect_anomalies_lof(data, contamination=0.05)

        assert 'error' not in result
        assert result['anomaly_count'] > 0

    def test_lof_insufficient_samples(self):
        result = detect_anomalies_lof(np.zeros((5, 2)))
        assert 'error' in result


class TestCausalDrift:
    def test_stable_when_relationship_unchanged(self):
        rng = np.random.RandomState(0)
        baseline_features = rng.normal(size=(200, 2))
        baseline_target = baseline_features[:, 0] * 2.0 + rng.normal(scale=0.1, size=200)

        current_features = rng.normal(size=(200, 2))
        current_target = current_features[:, 0] * 2.0 + rng.normal(scale=0.1, size=200)

        result = compute_causal_drift(
            baseline_features, baseline_target, current_features, current_target,
            feature_names=['f0', 'f1']
        )

        assert result['severity'] == 'stable'
        assert result['critical_count'] == 0

    def test_detects_sign_flip(self):
        rng = np.random.RandomState(0)
        baseline_features = rng.normal(size=(200, 1))
        baseline_target = baseline_features[:, 0] * 2.0 + rng.normal(scale=0.1, size=200)

        current_features = rng.normal(size=(200, 1))
        current_target = current_features[:, 0] * -2.0 + rng.normal(scale=0.1, size=200)

        result = compute_causal_drift(
            baseline_features, baseline_target, current_features, current_target,
            feature_names=['f0']
        )

        assert result['severity'] == 'critical'
        assert result['feature_drift']['f0']['sign_flip'] is True

    def test_insufficient_samples(self):
        result = compute_causal_drift(
            np.zeros((2, 1)), np.zeros(2), np.zeros((2, 1)), np.zeros(2)
        )
        assert 'error' in result

    def test_dimension_mismatch(self):
        result = compute_causal_drift(
            np.zeros((10, 2)), np.zeros(10), np.zeros((10, 3)), np.zeros(10)
        )
        assert 'error' in result
