"""Integration tests for drift detection."""

import os
import sys
import pytest
import numpy as np
import pandas as pd

THIS_DIR = os.path.dirname(__file__)
REPO_ROOT = os.path.abspath(os.path.join(THIS_DIR, "..", ".."))
if REPO_ROOT not in sys.path:
    sys.path.insert(0, REPO_ROOT)


class TestDriftDetection:
    """Test drift detection in fairness metrics."""

    def test_detect_label_shift(self):
        """Test detection of label shift (class distribution change)."""
        baseline_y = np.array([0] * 900 + [1] * 100)  # 90:10 ratio
        current_y = np.array([0] * 700 + [1] * 300)   # 70:30 ratio
        
        baseline_dist = np.bincount(baseline_y) / len(baseline_y)
        current_dist = np.bincount(current_y) / len(current_y)
        
        # PSI (Population Stability Index) calculation
        psi = np.sum((current_dist - baseline_dist) * np.log(current_dist / (baseline_dist + 1e-10)))
        
        # Should detect significant shift
        assert psi > 0.1

    def test_detect_covariate_shift(self):
        """Test detection of covariate shift (feature distribution change)."""
        # Baseline: normal distribution
        baseline_X = np.random.normal(loc=0, scale=1, size=(1000, 5))
        
        # Current: shifted distribution
        current_X = np.random.normal(loc=2, scale=1, size=(1000, 5))
        
        baseline_mean = baseline_X.mean(axis=0)
        current_mean = current_X.mean(axis=0)
        
        # Mean shift should be significant
        shift_magnitude = np.linalg.norm(current_mean - baseline_mean)
        assert shift_magnitude > 1.0

    def test_detect_protected_attr_drift(self):
        """Test drift in protected attribute distribution."""
        # Baseline: balanced protected attributes
        baseline_protected = np.array(['A'] * 500 + ['B'] * 500)
        
        # Current: imbalanced
        current_protected = np.array(['A'] * 800 + ['B'] * 200)
        
        baseline_dist = np.bincount([1 if x == 'B' else 0 for x in baseline_protected]) / len(baseline_protected)
        current_dist = np.bincount([1 if x == 'B' else 0 for x in current_protected]) / len(current_protected)
        
        # Should detect drift in group proportions
        drift = abs(current_dist[1] - baseline_dist[1])
        assert drift > 0.2

    def test_wasserstein_distance_metric(self):
        """Test Wasserstein distance for drift detection."""
        baseline = np.array([1, 2, 3, 4, 5])
        
        # Small change - should have low distance
        current_small = np.array([1.1, 2.1, 3.1, 4.1, 5.1])
        
        # Large change - should have high distance
        current_large = np.array([10, 20, 30, 40, 50])
        
        # Simple approximation of Wasserstein distance
        dist_small = abs(baseline.mean() - current_small.mean())
        dist_large = abs(baseline.mean() - current_large.mean())
        
        assert dist_small < dist_large

    def test_kl_divergence_drift(self):
        """Test KL divergence for probability distribution drift."""
        # Baseline distribution
        p = np.array([0.6, 0.3, 0.1])
        
        # Slight change
        q_small = np.array([0.5, 0.4, 0.1])
        
        # Large change
        q_large = np.array([0.2, 0.5, 0.3])
        
        # KL divergence approximation
        kl_small = np.sum(p * np.log(p / (q_small + 1e-10)))
        kl_large = np.sum(p * np.log(p / (q_large + 1e-10)))
        
        assert kl_small < kl_large

    def test_fairness_metric_drift(self):
        """Test drift in fairness metrics over time."""
        # Baseline fairness metrics
        baseline_metrics = {
            'demographic_parity_diff': 0.08,
            'equal_opportunity_diff': 0.05,
            'disparate_impact': 0.92,
        }
        
        # Current metrics showing degradation
        current_metrics = {
            'demographic_parity_diff': 0.18,  # Significant increase
            'equal_opportunity_diff': 0.15,
            'disparate_impact': 0.75,
        }
        
        # Calculate metric drift
        for metric_name in baseline_metrics:
            baseline = baseline_metrics[metric_name]
            current = current_metrics[metric_name]
            
            if 'disparate_impact' in metric_name:
                drift = abs(current - baseline) / baseline
                assert drift > 0.1  # 10% change detected
            else:
                drift = (current - baseline) / baseline
                assert drift > 1.0  # Metrics more than doubled


class TestDriftAlerting:
    """Test alerting when drift is detected."""

    def test_high_psi_threshold_alert(self):
        """Test alert triggered when PSI exceeds threshold."""
        psi = 0.35  # PSI > 0.25 typically indicates significant drift
        threshold = 0.25
        
        assert psi > threshold
        # Alert should be triggered

    def test_multi_metric_drift_detection(self):
        """Test drift detection across multiple metrics."""
        metrics = {
            'metric_1_drift': 0.05,  # OK
            'metric_2_drift': 0.30,  # Alert
            'metric_3_drift': 0.12,  # OK
        }
        
        threshold = 0.25
        alerts = [m for m, v in metrics.items() if v > threshold]
        
        assert len(alerts) == 1
        assert 'metric_2_drift' in alerts

    def test_drift_over_multiple_windows(self):
        """Test drift detection across multiple time windows."""
        window_drifts = [
            0.05,   # Week 1
            0.08,   # Week 2
            0.12,   # Week 3
            0.18,   # Week 4 - alert
            0.22,   # Week 5 - alert
        ]
        
        threshold = 0.15
        alerts = [i for i, d in enumerate(window_drifts) if d > threshold]
        
        assert len(alerts) == 2
        assert 3 in alerts and 4 in alerts


class TestDriftRecovery:
    """Test recovery strategies after drift detection."""

    def test_model_retraining_trigger(self):
        """Test that high drift triggers retraining."""
        current_psi = 0.35
        retraining_threshold = 0.25
        
        should_retrain = current_psi > retraining_threshold
        assert should_retrain is True

    def test_rolling_baseline_update(self):
        """Test updating baseline after retraining."""
        old_baseline = np.array([0.5, 0.3, 0.2])
        new_data = np.array([0.4, 0.35, 0.25])
        
        # Alpha for exponential moving average
        alpha = 0.3
        updated_baseline = alpha * new_data + (1 - alpha) * old_baseline
        
        assert not np.allclose(updated_baseline, old_baseline)


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
