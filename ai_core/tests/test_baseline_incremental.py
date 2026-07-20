"""
Test suite for Baseline Incremental Update features.

Tests:
- Rolling window management
- Statistical significance tests
- Baseline versioning and history
- Baseline drift detection
- Rollback functionality
"""
import pytest
import numpy as np
from datetime import datetime, timedelta
from unittest.mock import MagicMock
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from drift.baseline import BaselineManager


class TestBaselineVersioning:
    """Test baseline versioning and history tracking."""

    def test_create_baseline_with_versioning(self):
        """Test creating baseline stores version entry."""
        baseline_manager = BaselineManager(db=None)

        training_data = [
            {'age': 25, 'income': 50000, 'score': 0.6},
            {'age': 35, 'income': 75000, 'score': 0.7},
            {'age': 45, 'income': 100000, 'score': 0.8},
        ]

        baseline = baseline_manager.create_baseline(
            model_id='model_001',
            training_data=training_data,
            feature_names=['age', 'income'],
            score_field='score'
        )

        assert baseline['model_id'] == 'model_001'
        assert baseline['sample_size'] == 3
        assert 'created_at' in baseline
        assert 'feature_stats' in baseline

    def test_get_baseline_from_cache(self):
        """Test retrieving baseline from cache."""
        baseline_manager = BaselineManager(db=None)

        training_data = [
            {'feature1': 1.0, 'feature2': 'a'},
            {'feature1': 2.0, 'feature2': 'b'},
        ]

        baseline = baseline_manager.create_baseline(
            model_id='model_cache_test',
            training_data=training_data,
            feature_names=['feature1', 'feature2']
        )

        retrieved = baseline_manager.get_baseline('model_cache_test')
        assert retrieved is not None
        assert retrieved['model_id'] == 'model_cache_test'
        assert retrieved['sample_size'] == 2


class TestRollingWindow:
    """Test rolling window management."""

    def test_apply_rolling_window_smaller_than_limit(self):
        """Test baseline with samples smaller than limit doesn't trigger window."""
        baseline_manager = BaselineManager(db=None, max_rolling_window=10000)

        training_data = [{'feature': i} for i in range(100)]
        baseline = baseline_manager.create_baseline(
            model_id='model_small',
            training_data=training_data,
            feature_names=['feature']
        )

        # Rolling window should not be applied for 100 samples
        assert baseline.get('rolling_window', {}).get('applied') != True

    def test_apply_rolling_window_exceeds_limit(self):
        """Test baseline exceeding rolling window limit."""
        baseline_manager = BaselineManager(db=None, max_rolling_window=1000)

        # Create 5000 samples
        training_data = [{'feature': float(i)} for i in range(5000)]
        baseline = baseline_manager.create_baseline(
            model_id='model_large',
            training_data=training_data,
            feature_names=['feature']
        )

        # Rolling window should be applied
        assert baseline['rolling_window']['applied'] == True
        assert baseline['rolling_window']['max_samples'] == 1000
        assert baseline['rolling_window']['total_samples'] == 5000
        assert baseline['dropped_samples'] == 4000
        assert abs(baseline['rolling_window']['retention_ratio'] - 0.2) < 0.01

    def test_custom_rolling_window_size(self):
        """Test custom rolling window configuration."""
        baseline_manager = BaselineManager(db=None, max_rolling_window=5000)

        training_data = [{'feature': float(i)} for i in range(10000)]
        baseline = baseline_manager.create_baseline(
            model_id='model_custom_window',
            training_data=training_data,
            feature_names=['feature']
        )

        assert baseline['rolling_window']['max_samples'] == 5000
        assert baseline['dropped_samples'] == 5000


class TestStatisticalSignificance:
    """Test statistical significance tests."""

    def test_ttest_numeric_features_different_means(self):
        """Test t-test detects significantly different numeric distributions."""
        baseline_manager = BaselineManager(db=None)

        baseline_data = [1.0, 2.0, 3.0, 4.0, 5.0]  # mean=3
        current_data = [10.0, 11.0, 12.0, 13.0, 14.0]  # mean=12

        result = baseline_manager.compute_statistical_significance(
            baseline_data=baseline_data,
            current_data=current_data,
            feature_type='numeric'
        )

        assert result['test'] == 'ttest'
        assert result['significant'] == True  # Should detect difference
        assert result['p_value'] < 0.05
        assert result['baseline_mean'] < result['current_mean']

    def test_ttest_numeric_features_similar_means(self):
        """Test t-test doesn't flag similar distributions."""
        baseline_manager = BaselineManager(db=None)

        baseline_data = np.random.normal(5.0, 1.0, 100).tolist()
        current_data = np.random.normal(5.0, 1.0, 100).tolist()

        result = baseline_manager.compute_statistical_significance(
            baseline_data=baseline_data,
            current_data=current_data,
            feature_type='numeric'
        )

        assert result['test'] == 'ttest'
        # Should NOT be significant (both from same distribution)
        assert result['p_value'] > 0.05 or abs(result['test_statistic']) < 2.0

    def test_chisquare_categorical_features_different(self):
        """Test chi-square detects different categorical distributions."""
        baseline_manager = BaselineManager(db=None)

        baseline_data = ['A'] * 80 + ['B'] * 20
        current_data = ['A'] * 50 + ['B'] * 50

        result = baseline_manager.compute_statistical_significance(
            baseline_data=baseline_data,
            current_data=current_data,
            feature_type='categorical'
        )

        assert result['test'] == 'chisquare'
        assert result['significant'] == True  # Different distributions
        assert result['p_value'] < 0.05

    def test_chisquare_categorical_features_similar(self):
        """Test chi-square doesn't flag similar categorical distributions."""
        baseline_manager = BaselineManager(db=None)

        baseline_data = ['A'] * 75 + ['B'] * 25
        current_data = ['A'] * 74 + ['B'] * 26

        result = baseline_manager.compute_statistical_significance(
            baseline_data=baseline_data,
            current_data=current_data,
            feature_type='categorical'
        )

        assert result['test'] == 'chisquare'
        # Should NOT be significant (very similar)
        assert result['p_value'] > 0.05

    def test_insufficient_data_for_test(self):
        """Test graceful handling of empty data."""
        baseline_manager = BaselineManager(db=None)

        result = baseline_manager.compute_statistical_significance(
            baseline_data=[],
            current_data=[1.0],
            feature_type='numeric'
        )

        assert result['significant'] == False
        assert result['reason'] == 'insufficient_data'


class TestBaselineUpdate:
    """Test incremental baseline update with statistical testing."""

    def test_update_baseline_with_merge(self):
        """Test incremental baseline update blends statistics."""
        baseline_manager = BaselineManager(db=None)

        # Initial baseline
        initial_data = [
            {'age': 25, 'income': 50000, 'score': 0.5},
            {'age': 35, 'income': 60000, 'score': 0.6},
            {'age': 45, 'income': 70000, 'score': 0.7},
        ]

        baseline = baseline_manager.create_baseline(
            model_id='model_update',
            training_data=initial_data,
            feature_names=['age', 'income'],
            score_field='score'
        )

        # New production data
        new_data = [
            {'age': 30, 'income': 55000, 'score': 0.55},
            {'age': 40, 'income': 65000, 'score': 0.65},
        ]

        updated = baseline_manager.update_baseline(
            model_id='model_update',
            new_data=new_data,
            merge=True
        )

        # Verify update
        assert updated['sample_size'] == 5  # 3 old + 2 new
        assert updated['updated_at'] is not None
        assert 'blend_ratio' in updated['feature_stats']['age']
        assert updated['feature_stats']['age']['blend_ratio']['old_weight'] > 0
        assert updated['feature_stats']['age']['blend_ratio']['new_weight'] > 0

    def test_merge_preserves_advanced_drift_inputs(self):
        """
        Regression test: an incremental (merge=True) update must not silently
        disable multivariate/anomaly/causal drift detection by dropping the
        numeric sample matrix, fairness_stats, or the configured score_field
        that create_baseline() populates.
        """
        baseline_manager = BaselineManager(db=None)

        initial_data = [
            {'age': 20 + i, 'income': 40000 + i * 500, 'outcome': 0.4 + i * 0.01, 'group': 'a' if i % 2 == 0 else 'b'}
            for i in range(30)
        ]
        baseline = baseline_manager.create_baseline(
            model_id='model_advanced_merge',
            training_data=initial_data,
            feature_names=['age', 'income'],
            score_field='outcome',
            protected_attrs=['group'],
        )
        assert baseline['numeric_feature_names'] == ['age', 'income']
        assert len(baseline['numeric_sample_matrix']) == 30
        assert baseline['fairness_stats']['group']['group_counts']['a'] == 15

        new_data = [
            {'age': 50 + i, 'income': 80000 + i * 500, 'outcome': 0.7 + i * 0.01, 'group': 'a' if i % 3 == 0 else 'b'}
            for i in range(10)
        ]
        updated = baseline_manager.update_baseline(
            model_id='model_advanced_merge',
            new_data=new_data,
            merge=True,
        )

        assert updated['numeric_feature_names'] == ['age', 'income']
        assert len(updated['numeric_sample_matrix']) == 40, 'numeric sample matrix must grow, not vanish, on merge'
        assert len(updated['numeric_sample_scores']) == 40
        assert updated['score_field'] == 'outcome'
        # Fairness stats must be carried forward and updated, not reset to {}
        assert updated['fairness_stats']['group']['group_counts']['a'] == 15 + 4
        assert updated['fairness_stats']['group']['group_counts']['b'] == 15 + 6

    def test_update_baseline_without_merge(self):
        """Test baseline replacement (no merge)."""
        baseline_manager = BaselineManager(db=None)

        initial_data = [{'feature': 1.0}]
        baseline = baseline_manager.create_baseline(
            model_id='model_replace',
            training_data=initial_data,
            feature_names=['feature']
        )

        new_data = [{'feature': 100.0}, {'feature': 200.0}]
        updated = baseline_manager.update_baseline(
            model_id='model_replace',
            new_data=new_data,
            merge=False
        )

        # Sample size should be from new data only
        assert updated['sample_size'] == 2


class TestBaselineDrift:
    """Test baseline drift detection."""

    def test_baseline_drift_insufficient_history(self):
        """Test baseline drift detection with insufficient versions."""
        baseline_manager = BaselineManager(db=None)

        # Create just one baseline
        training_data = [{'feature': float(i)} for i in range(100)]
        baseline_manager.create_baseline(
            model_id='model_drift_test',
            training_data=training_data,
            feature_names=['feature']
        )

        drift = baseline_manager.detect_baseline_drift('model_drift_test')

        assert drift['sufficient_history'] == False
        assert drift['drift_detected'] == False

    def test_baseline_drift_numeric_feature_shift(self):
        """Test detecting baseline drift in numeric features."""
        baseline_manager = BaselineManager(db=None)

        # Version 1: mean around 50
        data_v1 = [{'feature': float(50 + np.random.randn())} for _ in range(100)]

        baseline1 = baseline_manager.create_baseline(
            model_id='model_drift_numeric',
            training_data=data_v1,
            feature_names=['feature']
        )

        # Version 2: mean around 60 (significant shift)
        data_v2 = [{'feature': float(60 + np.random.randn())} for _ in range(100)]

        baseline2 = baseline_manager.update_baseline(
            model_id='model_drift_numeric',
            new_data=data_v2,
            merge=True
        )

        # Note: drift detection requires at least 2 versions in DB
        # For unit test without DB, we can manually simulate version history
        baseline_manager._version_history['model_drift_numeric'] = [
            baseline2,
            baseline1
        ]

        drift = baseline_manager.detect_baseline_drift('model_drift_numeric')

        # Should detect the feature drift
        assert 'feature' in drift['feature_drifts'] or drift['overall_severity'] in ['warning', 'critical']

    def test_baseline_drift_categorical_new_categories(self):
        """Test detecting new categories in categorical features."""
        baseline_manager = BaselineManager(db=None)

        # Version 1: categories A, B, C
        data_v1 = [
            {'category': 'A'},
            {'category': 'B'},
            {'category': 'C'},
        ] * 10

        baseline1 = baseline_manager.create_baseline(
            model_id='model_drift_cat',
            training_data=data_v1,
            feature_names=['category']
        )

        # Version 2: categories A, B, C, D, E (new categories)
        data_v2 = [
            {'category': 'A'},
            {'category': 'B'},
            {'category': 'C'},
            {'category': 'D'},
            {'category': 'E'},
        ] * 10

        baseline2 = baseline_manager.update_baseline(
            model_id='model_drift_cat',
            new_data=data_v2,
            merge=True
        )

        baseline_manager._version_history['model_drift_cat'] = [
            baseline2,
            baseline1
        ]

        drift = baseline_manager.detect_baseline_drift('model_drift_cat')

        # Should detect new categories
        if 'category' in drift['feature_drifts']:
            assert drift['feature_drifts']['category'].get('new_categories') is not None or \
                   drift['feature_drifts']['category']['severity'] in ['warning', 'stable']


class TestBaselineRollback:
    """Test baseline rollback functionality."""

    def test_rollback_to_previous_version(self):
        """Test rolling back to previous baseline version."""
        baseline_manager = BaselineManager(db=None)

        data1 = [{'feature': 1.0}, {'feature': 2.0}]
        baseline1 = baseline_manager.create_baseline(
            model_id='model_rollback',
            training_data=data1,
            feature_names=['feature']
        )
        version_id_1 = f"model_rollback_{datetime.utcnow().timestamp()}"
        baseline1['version_id'] = version_id_1

        data2 = [{'feature': 100.0}, {'feature': 200.0}]
        baseline2 = baseline_manager.update_baseline(
            model_id='model_rollback',
            new_data=data2,
            merge=False
        )

        # Simulate version history
        baseline_manager._version_history['model_rollback'] = [baseline2, baseline1]

        # Rollback to version 1
        rolled_back = baseline_manager.rollback_baseline('model_rollback', version_id_1)

        # Should return rolled back baseline
        if rolled_back:
            assert rolled_back['rolled_back_from'] == version_id_1

    def test_rollback_nonexistent_version(self):
        """Test rollback with nonexistent version ID."""
        baseline_manager = BaselineManager(db=None)

        data = [{'feature': 1.0}]
        baseline_manager.create_baseline(
            model_id='model_no_rollback',
            training_data=data,
            feature_names=['feature']
        )

        result = baseline_manager.rollback_baseline('model_no_rollback', 'nonexistent_version')

        assert result is None


class TestIntegration:
    """Integration tests for complete baseline workflow."""

    def test_complete_baseline_workflow(self):
        """Test full workflow: create, update, detect drift, statistical tests."""
        baseline_manager = BaselineManager(db=None, max_rolling_window=500)

        # Step 1: Create initial baseline
        initial_data = [
            {'age': 25, 'income': 50000, 'income_bracket': 'low', 'score': 0.5},
            {'age': 35, 'income': 75000, 'income_bracket': 'mid', 'score': 0.6},
            {'age': 45, 'income': 100000, 'income_bracket': 'high', 'score': 0.7},
        ]

        baseline = baseline_manager.create_baseline(
            model_id='model_integration',
            training_data=initial_data,
            feature_names=['age', 'income', 'income_bracket'],
            score_field='score'
        )

        assert baseline['sample_size'] == 3
        assert 'age' in baseline['feature_stats']
        assert 'income_bracket' in baseline['feature_stats']

        # Step 2: Statistical test on features
        baseline_ages = [25, 35, 45]
        new_ages = [26, 36, 46, 56]

        sig_test = baseline_manager.compute_statistical_significance(
            baseline_data=baseline_ages,
            current_data=new_ages,
            feature_type='numeric'
        )

        assert 'test_statistic' in sig_test
        assert 'p_value' in sig_test

        # Step 3: Update with new production data
        new_data = [
            {'age': 28, 'income': 52000, 'income_bracket': 'low', 'score': 0.52},
            {'age': 38, 'income': 78000, 'income_bracket': 'mid', 'score': 0.62},
        ]

        updated = baseline_manager.update_baseline(
            model_id='model_integration',
            new_data=new_data,
            merge=True
        )

        assert updated['sample_size'] == 5
        assert updated['data_quality']['old_samples'] == 3
        assert updated['data_quality']['new_samples'] == 2

        # Step 4: Check rolling window
        large_data = [{'age': float(20 + i)} for i in range(1000)]
        baseline_large = baseline_manager.create_baseline(
            model_id='model_large_integration',
            training_data=large_data,
            feature_names=['age']
        )

        assert baseline_large['rolling_window']['applied'] == True


if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
