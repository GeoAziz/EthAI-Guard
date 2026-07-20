"""
Baseline Snapshot Manager

Manages training baseline distributions for drift comparison.
Stores and retrieves feature statistics, score histograms, and fairness metrics.
Includes versioning, rolling window management, statistical significance tests,
and baseline drift detection.
"""
from typing import Dict, Any, List, Tuple
import json
import numpy as np
from datetime import datetime
from scipy import stats
from collections import deque


class BaselineManager:
    """
    Manages baseline snapshots for drift detection.

    Stores training data statistics including:
    - Feature distributions (histograms)
    - Score distribution
    - Fairness metrics
    - Data quality metrics
    """

    def __init__(self, db=None, max_rolling_window: int = 10000):
        """
        Initialize baseline manager.

        Args:
            db: Database connection (optional)
            max_rolling_window: Maximum samples to keep in rolling window (default: 10K)
        """
        self.db = db
        self._cache = {}
        self.max_rolling_window = max_rolling_window
        self._version_history = {}  # model_id -> list of versions
        self._baseline_drift_cache = {}  # model_id -> drift stats

    def create_baseline(
        self,
        model_id: str,
        training_data: List[Dict[str, Any]],
        feature_names: List[str],
        score_field: str = 'risk_score',
        protected_attrs: List[str] | None = None
    ) -> Dict[str, Any]:
        """
        Create baseline snapshot from training data.

        Args:
            model_id: Model identifier
            training_data: List of training examples
            feature_names: List of feature names to track
            score_field: Field name for model output score
            protected_attrs: Protected attributes for fairness tracking

        Returns:
            Baseline snapshot dict
        """
        baseline = {
            'model_id': model_id,
            'created_at': datetime.utcnow().isoformat() + 'Z',
            'sample_size': len(training_data),
            'score_field': score_field,
            'protected_attrs': protected_attrs or [],
            'feature_stats': {},
            'score_stats': {},
            'fairness_stats': {},
            'data_quality': {}
        }

        # Compute feature statistics
        for feature in feature_names:
            values = [sample.get(feature) for sample in training_data if sample.get(feature) is not None]

            if not values:
                continue

            # Numeric features
            if isinstance(values[0], (int, float)):
                values_array = np.array(values, dtype=float)
                counts, bin_edges = np.histogram(values_array, bins=20)

                baseline['feature_stats'][feature] = {
                    'type': 'numeric',
                    'histogram': counts.tolist(),
                    'bin_edges': bin_edges.tolist(),
                    'mean': float(np.mean(values_array)),
                    'std': float(np.std(values_array)),
                    'min': float(np.min(values_array)),
                    'max': float(np.max(values_array)),
                    'p50': float(np.percentile(values_array, 50)),
                    'p95': float(np.percentile(values_array, 95))
                }

            # Categorical features
            else:
                values_array = np.array(values)
                unique_values, counts = np.unique(values_array, return_counts=True)
                baseline['feature_stats'][feature] = {
                    'type': 'categorical',
                    'categories': unique_values.tolist(),
                    'counts': counts.tolist(),
                    'unique_count': len(unique_values)
                }

        # Compute score statistics
        scores = [sample.get(score_field) for sample in training_data if sample.get(score_field) is not None]
        if scores:
            scores_array = np.array(scores, dtype=float)
            counts, bin_edges = np.histogram(scores_array, bins=20)

            baseline['score_stats'] = {
                'histogram': counts.tolist(),
                'bin_edges': bin_edges.tolist(),
                'mean': float(np.mean(scores_array)),
                'std': float(np.std(scores_array)),
                'min': float(np.min(scores_array)),
                'max': float(np.max(scores_array)),
                'p50': float(np.percentile(scores_array, 50)),
                'p95': float(np.percentile(scores_array, 95))
            }

        # Compute fairness baseline (if protected attributes provided)
        if protected_attrs:
            for attr in protected_attrs:
                attr_values = [sample.get(attr) for sample in training_data if sample.get(attr) is not None]
                if attr_values:
                    unique_groups = list(set(attr_values))
                    baseline['fairness_stats'][attr] = {
                        'groups': unique_groups,
                        'group_counts': {group: attr_values.count(group) for group in unique_groups}
                    }

        # Data quality metrics
        null_rates = {}
        for feature in feature_names:
            total = len(training_data)
            null_count = sum(1 for sample in training_data if sample.get(feature) is None)
            null_rates[feature] = null_count / total if total > 0 else 0.0

        baseline['data_quality'] = {
            'null_rates': null_rates,
            'total_samples': len(training_data)
        }

        # Retain a capped raw sample of numeric feature vectors + target scores
        # so advanced drift analyses (multivariate, causal) can be run later
        # without needing to re-query the full training set.
        numeric_feature_names = [
            f for f in feature_names
            if baseline['feature_stats'].get(f, {}).get('type') == 'numeric'
        ]
        if numeric_feature_names:
            max_raw_samples = 2000
            sampled_data = training_data[:max_raw_samples]
            matrix = []
            targets = []
            for sample in sampled_data:
                if any(sample.get(f) is None for f in numeric_feature_names):
                    continue
                if sample.get(score_field) is None:
                    continue
                matrix.append([float(sample[f]) for f in numeric_feature_names])
                targets.append(float(sample[score_field]))

            if matrix:
                baseline['numeric_feature_names'] = numeric_feature_names
                baseline['numeric_sample_matrix'] = matrix
                baseline['numeric_sample_scores'] = targets

        # Apply rolling window management
        baseline = self._apply_rolling_window(baseline, len(training_data))

        # Store in database if available
        if self.db:
            self._store_baseline(baseline)

        # Cache
        self._cache[model_id] = baseline

        return baseline

    def get_baseline(self, model_id: str) -> Dict[str, Any] | None:
        """
        Retrieve baseline for model.

        Args:
            model_id: Model identifier

        Returns:
            Baseline snapshot or None if not found
        """
        # Check cache first
        if model_id in self._cache:
            return self._cache[model_id]

        # Query database
        if self.db:
            baseline = self._load_baseline(model_id)
            if baseline:
                self._cache[model_id] = baseline
                return baseline

        return None

    def update_baseline(
        self,
        model_id: str,
        new_data: List[Dict[str, Any]],
        merge: bool = False
    ) -> Dict[str, Any]:
        """
        Update baseline with new data.

        Args:
            model_id: Model identifier
            new_data: New training examples
            merge: Whether to merge with existing baseline or replace

        Returns:
            Updated baseline snapshot
        """
        if merge:
            # Incremental baseline update: blend old and new statistics
            existing_baseline = self.get_baseline(model_id)
            if not existing_baseline:
                # No existing baseline, create new one
                feature_names = list(set(k for sample in new_data for k in sample.keys()))
                return self.create_baseline(model_id, new_data, feature_names)

            # Blend existing with new data using exponential moving average
            old_size = existing_baseline['sample_size']
            new_size = len(new_data)
            total_size = old_size + new_size

            # Weight for blending: older data gets less weight
            old_weight = old_size / total_size
            new_weight = new_size / total_size

            score_field = existing_baseline.get('score_field', 'risk_score')
            protected_attrs = existing_baseline.get('protected_attrs', [])

            updated_baseline = {
                'model_id': model_id,
                'created_at': existing_baseline['created_at'],
                'updated_at': datetime.utcnow().isoformat() + 'Z',
                'sample_size': total_size,
                'previous_sample_size': old_size,
                'score_field': score_field,
                'protected_attrs': protected_attrs,
                'feature_stats': {},
                'score_stats': {},
                'fairness_stats': {},
                'data_quality': {}
            }

            # Blend feature statistics
            for feature in existing_baseline['feature_stats'].keys():
                old_stats = existing_baseline['feature_stats'][feature]
                new_data_values = [sample.get(feature) for sample in new_data if sample.get(feature) is not None]

                if not new_data_values:
                    # Keep old stats if no new data for this feature
                    updated_baseline['feature_stats'][feature] = old_stats
                    continue

                new_values_array = np.array(new_data_values)

                if old_stats['type'] == 'numeric':
                    old_mean = old_stats['mean']
                    old_std = old_stats['std']
                    old_min = old_stats['min']
                    old_max = old_stats['max']

                    new_mean = float(np.mean(new_values_array))
                    new_std = float(np.std(new_values_array))
                    new_min = float(np.min(new_values_array))
                    new_max = float(np.max(new_values_array))

                    # Blend statistics using the pooled-variance formula, which
                    # (unlike a plain weighted average of variances) accounts for
                    # the shift between the two group means:
                    #   var = w1*var1 + w2*var2 + w1*w2*(mean1-mean2)^2
                    blended_mean = old_mean * old_weight + new_mean * new_weight
                    mean_shift_term = old_weight * new_weight * (old_mean - new_mean) ** 2
                    blended_var = (old_std ** 2) * old_weight + (new_std ** 2) * new_weight + mean_shift_term
                    blended_std = float(np.sqrt(blended_var))

                    # Blend the histogram deterministically by reusing the old bin
                    # edges (no fabricated samples): re-bin the new data onto the
                    # same edges and combine counts weighted by each side's size.
                    old_bin_edges = np.array(old_stats['bin_edges'])
                    old_counts = np.array(old_stats['histogram'], dtype=float)
                    new_counts_on_old_bins, _ = np.histogram(new_values_array, bins=old_bin_edges)
                    blended_counts = old_counts * old_weight + new_counts_on_old_bins * new_weight

                    # Percentiles can't be exactly reconstructed from summary
                    # stats alone; approximate via a weighted blend of the two
                    # sides' percentiles rather than resampling a fake distribution.
                    blended_p50 = old_stats['p50'] * old_weight + float(np.percentile(new_values_array, 50)) * new_weight
                    blended_p95 = old_stats['p95'] * old_weight + float(np.percentile(new_values_array, 95)) * new_weight

                    updated_baseline['feature_stats'][feature] = {
                        'type': 'numeric',
                        'histogram': blended_counts.tolist(),
                        'bin_edges': old_bin_edges.tolist(),
                        'mean': float(blended_mean),
                        'std': blended_std,
                        'min': min(old_min, new_min),
                        'max': max(old_max, new_max),
                        'p50': blended_p50,
                        'p95': blended_p95,
                        'blend_ratio': {'old_weight': old_weight, 'new_weight': new_weight}
                    }
                else:
                    # Categorical: update category counts
                    old_categories = set(old_stats['categories'])
                    new_categories = set(new_data_values)
                    all_categories = sorted(old_categories.union(new_categories))

                    new_unique_values, new_counts = np.unique(new_values_array, return_counts=True)
                    new_counts_dict = dict(zip(new_unique_values.tolist(), new_counts.tolist()))

                    blended_counts = []
                    for cat in all_categories:
                        old_count = old_stats['counts'][old_stats['categories'].index(cat)] if cat in old_stats['categories'] else 0
                        new_count = new_counts_dict.get(cat, 0)
                        blended = int(old_count * old_weight + new_count * new_weight)
                        blended_counts.append(blended)

                    updated_baseline['feature_stats'][feature] = {
                        'type': 'categorical',
                        'categories': all_categories,
                        'counts': blended_counts,
                        'unique_count': len(all_categories),
                        'blend_ratio': {'old_weight': old_weight, 'new_weight': new_weight}
                    }

            # Blend score statistics
            scores = [sample.get(score_field) for sample in new_data if sample.get(score_field) is not None]
            if scores and 'score_stats' in existing_baseline and existing_baseline['score_stats']:
                old_scores = existing_baseline['score_stats']
                scores_array = np.array(scores, dtype=float)

                old_mean = old_scores['mean']
                old_std = old_scores['std']
                new_mean = float(np.mean(scores_array))
                new_std = float(np.std(scores_array))

                blended_mean = old_mean * old_weight + new_mean * new_weight
                mean_shift_term = old_weight * new_weight * (old_mean - new_mean) ** 2
                blended_var = (old_std ** 2) * old_weight + (new_std ** 2) * new_weight + mean_shift_term
                blended_std = float(np.sqrt(blended_var))

                old_bin_edges = np.array(old_scores['bin_edges'])
                new_counts_on_old_bins, _ = np.histogram(scores_array, bins=old_bin_edges)
                old_counts = np.array(old_scores['histogram'], dtype=float)
                blended_counts = old_counts * old_weight + new_counts_on_old_bins * new_weight

                blended_p50 = old_scores['p50'] * old_weight + float(np.percentile(scores_array, 50)) * new_weight
                blended_p95 = old_scores['p95'] * old_weight + float(np.percentile(scores_array, 95)) * new_weight

                updated_baseline['score_stats'] = {
                    'histogram': blended_counts.tolist(),
                    'bin_edges': old_bin_edges.tolist(),
                    'mean': float(blended_mean),
                    'std': blended_std,
                    'min': min(old_scores['min'], float(np.min(scores_array))),
                    'max': max(old_scores['max'], float(np.max(scores_array))),
                    'p50': blended_p50,
                    'p95': blended_p95,
                    'blend_ratio': {'old_weight': old_weight, 'new_weight': new_weight}
                }
            else:
                updated_baseline['score_stats'] = existing_baseline['score_stats']

            # Update data quality
            null_rates = {}
            for feature in existing_baseline['feature_stats'].keys():
                total = len(new_data)
                null_count = sum(1 for sample in new_data if sample.get(feature) is None)
                null_rates[feature] = null_count / total if total > 0 else 0.0

            updated_baseline['data_quality'] = {
                'null_rates': null_rates,
                'total_samples': total_size,
                'old_samples': old_size,
                'new_samples': new_size
            }

            # Recompute fairness stats (group counts) by combining old counts
            # with counts observed in the new data, rather than discarding them.
            old_fairness_stats = existing_baseline.get('fairness_stats') or {}
            updated_fairness_stats = {}
            for attr in protected_attrs:
                new_attr_values = [sample.get(attr) for sample in new_data if sample.get(attr) is not None]
                old_attr_stats = old_fairness_stats.get(attr)
                old_group_counts = old_attr_stats['group_counts'] if old_attr_stats else {}
                new_group_counts = {}
                for v in new_attr_values:
                    new_group_counts[v] = new_group_counts.get(v, 0) + 1
                combined_groups = sorted(set(old_group_counts.keys()) | set(new_group_counts.keys()))
                combined_counts = {
                    g: old_group_counts.get(g, 0) + new_group_counts.get(g, 0)
                    for g in combined_groups
                }
                updated_fairness_stats[attr] = {
                    'groups': combined_groups,
                    'group_counts': combined_counts,
                }
            updated_baseline['fairness_stats'] = updated_fairness_stats or old_fairness_stats

            # Carry forward (and extend) the raw numeric sample matrix that
            # advanced drift analysis (multivariate/anomaly/causal) depends on.
            # Without this, that analysis silently stops running after the
            # first incremental update since worker.py gates on these fields.
            numeric_feature_names = existing_baseline.get('numeric_feature_names')
            if numeric_feature_names:
                max_raw_samples = 2000
                new_matrix_rows = []
                new_target_rows = []
                for sample in new_data:
                    if any(sample.get(f) is None for f in numeric_feature_names):
                        continue
                    if sample.get(score_field) is None:
                        continue
                    new_matrix_rows.append([float(sample[f]) for f in numeric_feature_names])
                    new_target_rows.append(float(sample[score_field]))

                combined_matrix = (existing_baseline.get('numeric_sample_matrix') or []) + new_matrix_rows
                combined_scores = (existing_baseline.get('numeric_sample_scores') or []) + new_target_rows
                # Keep the most recent max_raw_samples rows so this stays bounded.
                updated_baseline['numeric_feature_names'] = numeric_feature_names
                updated_baseline['numeric_sample_matrix'] = combined_matrix[-max_raw_samples:]
                updated_baseline['numeric_sample_scores'] = combined_scores[-max_raw_samples:]

            # Apply rolling window management
            updated_baseline = self._apply_rolling_window(updated_baseline, total_size)

            # Store in database if available
            if self.db:
                self._store_baseline(updated_baseline)

            # Update cache
            self._cache[model_id] = updated_baseline

            return updated_baseline
        else:
            # Replace baseline completely
            existing_baseline = self.get_baseline(model_id)
            feature_names = list(existing_baseline['feature_stats'].keys()) if existing_baseline else []
            return self.create_baseline(model_id, new_data, feature_names)

    def get_baseline_history(self, model_id: str) -> List[Dict[str, Any]]:
        """
        Get version history for a model's baseline.

        Args:
            model_id: Model identifier

        Returns:
            List of baseline versions (newest first)
        """
        if self.db:
            try:
                collection = self.db['baseline_versions']
                versions = list(collection.find(
                    {'model_id': model_id},
                    sort=[('created_at', -1)]
                ))
                for v in versions:
                    v.pop('_id', None)
                return versions
            except Exception as e:
                print(f"Warning: Failed to load baseline history: {e}")
        return self._version_history.get(model_id, [])

    def rollback_baseline(self, model_id: str, version_id: str) -> Dict[str, Any] | None:
        """
        Rollback to a previous baseline version.

        Args:
            model_id: Model identifier
            version_id: Version ID to rollback to

        Returns:
            Rolled-back baseline or None if not found
        """
        history = self.get_baseline_history(model_id)
        for version in history:
            if version.get('version_id') == version_id:
                # Store as new baseline with rollback marker
                rolled_back = version.copy()
                rolled_back['rolled_back_from'] = version_id
                rolled_back['created_at'] = datetime.utcnow().isoformat() + 'Z'

                if self.db:
                    self._store_baseline(rolled_back)
                self._cache[model_id] = rolled_back
                return rolled_back
        return None

    def compute_statistical_significance(
        self,
        baseline_data: List[float],
        current_data: List[float],
        feature_type: str = 'numeric'
    ) -> Dict[str, Any]:
        """
        Test statistical significance between baseline and current distributions.

        Uses t-test for numeric features, chi-square for categorical.

        Args:
            baseline_data: Baseline feature values
            current_data: Current feature values
            feature_type: 'numeric' or 'categorical'

        Returns:
            Dict with test_statistic, p_value, significant (at α=0.05)
        """
        if not baseline_data or not current_data:
            return {
                'test_statistic': None,
                'p_value': None,
                'significant': False,
                'reason': 'insufficient_data'
            }

        try:
            if feature_type == 'numeric':
                baseline_array = np.array(baseline_data, dtype=float)
                current_array = np.array(current_data, dtype=float)

                # Two-sample t-test
                t_stat, p_value = stats.ttest_ind(baseline_array, current_array)

                return {
                    'test': 'ttest',
                    'test_statistic': float(t_stat),
                    'p_value': float(p_value),
                    'significant': p_value < 0.05,
                    'baseline_mean': float(np.mean(baseline_array)),
                    'current_mean': float(np.mean(current_array)),
                    'baseline_std': float(np.std(baseline_array)),
                    'current_std': float(np.std(current_array))
                }
            else:  # categorical
                baseline_array = np.array(baseline_data)
                current_array = np.array(current_data)

                # Get unique categories
                all_cats = np.unique(np.concatenate([baseline_array, current_array]))

                # Build contingency table
                baseline_counts = np.array([np.sum(baseline_array == cat) for cat in all_cats], dtype=float)
                current_counts = np.array([np.sum(current_array == cat) for cat in all_cats], dtype=float)

                baseline_total = baseline_counts.sum()
                current_total = current_counts.sum()
                if baseline_total == 0 or current_total == 0:
                    return {
                        'test_statistic': None,
                        'p_value': None,
                        'significant': False,
                        'reason': 'insufficient_data'
                    }

                # scipy.stats.chisquare requires f_obs and f_exp to sum to the
                # same total (baseline and current windows are almost never
                # the same size), so scale the baseline counts to the current
                # sample size to use as the expected distribution. Categories
                # with zero expected count are dropped to avoid a divide-by-zero.
                expected_counts = baseline_counts * (current_total / baseline_total)
                nonzero = expected_counts > 0
                chi2_stat, p_value = stats.chisquare(current_counts[nonzero], expected_counts[nonzero])

                return {
                    'test': 'chisquare',
                    'test_statistic': float(chi2_stat),
                    'p_value': float(p_value),
                    'significant': p_value < 0.05,
                    'baseline_categories': len(np.unique(baseline_array)),
                    'current_categories': len(np.unique(current_array))
                }
        except Exception as e:
            return {
                'test_statistic': None,
                'p_value': None,
                'significant': False,
                'error': str(e)
            }

    def detect_baseline_drift(self, model_id: str) -> Dict[str, Any]:
        """
        Detect if baseline itself is drifting over time.

        Compares recent versions to detect systematic drift in baseline stats.

        Args:
            model_id: Model identifier

        Returns:
            Dict with drift metrics and severity
        """
        history = self.get_baseline_history(model_id)

        if len(history) < 2:
            return {
                'sufficient_history': False,
                'drift_detected': False,
                'reason': 'need_at_least_2_versions'
            }

        # Compare last 2 versions
        recent = history[0]
        previous = history[1] if len(history) > 1 else history[0]

        drift_metrics = {
            'sufficient_history': True,
            'comparison_versions': 2,
            'time_delta': None,
            'feature_drifts': {},
            'score_drift': None,
            'overall_severity': 'stable',
            'drifting_features': []
        }

        # Parse timestamps
        try:
            recent_time = datetime.fromisoformat(recent['updated_at'] or recent['created_at'])
            previous_time = datetime.fromisoformat(previous['updated_at'] or previous['created_at'])
            drift_metrics['time_delta'] = (recent_time - previous_time).total_seconds()
        except:
            pass

        # Compare feature statistics
        for feature, recent_stats in recent.get('feature_stats', {}).items():
            if feature not in previous.get('feature_stats', {}):
                continue

            prev_stats = previous['feature_stats'][feature]

            if recent_stats['type'] == 'numeric' and prev_stats['type'] == 'numeric':
                # Mean shift test
                mean_shift = abs(recent_stats['mean'] - prev_stats['mean']) / max(prev_stats['std'], 1e-6)
                drift_metrics['feature_drifts'][feature] = {
                    'mean_shift_std': float(mean_shift),
                    'recent_mean': recent_stats['mean'],
                    'previous_mean': prev_stats['mean'],
                    'severity': 'critical' if mean_shift > 2 else ('warning' if mean_shift > 1 else 'stable')
                }
                if mean_shift > 1:
                    drift_metrics['drifting_features'].append(feature)

            elif recent_stats['type'] == 'categorical' and prev_stats['type'] == 'categorical':
                # Category shift - new categories or missing ones
                recent_cats = set(recent_stats['categories'])
                prev_cats = set(prev_stats['categories'])
                new_cats = recent_cats - prev_cats
                missing_cats = prev_cats - recent_cats

                drift_metrics['feature_drifts'][feature] = {
                    'new_categories': list(new_cats) if new_cats else None,
                    'missing_categories': list(missing_cats) if missing_cats else None,
                    'severity': 'warning' if (new_cats or missing_cats) else 'stable'
                }
                if new_cats or missing_cats:
                    drift_metrics['drifting_features'].append(feature)

        # Score distribution drift
        if 'score_stats' in recent and 'score_stats' in previous:
            recent_score = recent['score_stats']
            prev_score = previous['score_stats']
            if recent_score and prev_score and 'mean' in recent_score and 'mean' in prev_score:
                score_shift = abs(recent_score['mean'] - prev_score['mean']) / max(prev_score['std'], 1e-6)
                drift_metrics['score_drift'] = {
                    'mean_shift_std': float(score_shift),
                    'recent_mean': recent_score['mean'],
                    'previous_mean': prev_score['mean'],
                    'severity': 'critical' if score_shift > 2 else ('warning' if score_shift > 1 else 'stable')
                }

        # Determine overall severity
        severities = [d.get('severity', 'stable') for d in drift_metrics['feature_drifts'].values()]
        if drift_metrics['score_drift']:
            severities.append(drift_metrics['score_drift']['severity'])

        if 'critical' in severities:
            drift_metrics['overall_severity'] = 'critical'
        elif 'warning' in severities:
            drift_metrics['overall_severity'] = 'warning'

        self._baseline_drift_cache[model_id] = drift_metrics
        return drift_metrics

    def _apply_rolling_window(
        self,
        baseline: Dict[str, Any],
        sample_size: int
    ) -> Dict[str, Any]:
        """
        Apply rolling window limits to baseline.

        Keeps only most recent samples up to max_rolling_window.

        Args:
            baseline: Baseline dict
            sample_size: Current sample size

        Returns:
            Updated baseline with rolling window applied
        """
        if sample_size <= self.max_rolling_window:
            return baseline

        # Mark that rolling window was applied
        window_ratio = self.max_rolling_window / sample_size
        baseline['rolling_window'] = {
            'applied': True,
            'max_samples': self.max_rolling_window,
            'total_samples': sample_size,
            'retention_ratio': float(window_ratio)
        }

        # Store metadata about dropped samples
        baseline['dropped_samples'] = sample_size - self.max_rolling_window

        return baseline

    def _store_baseline(self, baseline: Dict[str, Any]) -> None:
        """Store baseline in database with versioning."""
        if not self.db:
            return

        try:
            model_id = baseline['model_id']

            # Store in baselines collection (current version)
            collection = self.db['drift_baselines']
            collection.update_one(
                {'model_id': model_id},
                {'$set': baseline},
                upsert=True
            )

            # Store version in history
            version_entry = baseline.copy()
            version_entry['version_id'] = f"{model_id}_{datetime.utcnow().timestamp()}"
            version_entry['stored_at'] = datetime.utcnow().isoformat() + 'Z'

            versions_collection = self.db['baseline_versions']
            versions_collection.insert_one(version_entry)

            # Keep only last 10 versions to avoid bloat
            all_versions = list(versions_collection.find(
                {'model_id': model_id},
                sort=[('created_at', -1)],
                skip=10
            ))
            if all_versions:
                old_version_ids = [v['_id'] for v in all_versions]
                versions_collection.delete_many({'_id': {'$in': old_version_ids}})

        except Exception as e:
            print(f"Warning: Failed to store baseline: {e}")

    def _load_baseline(self, model_id: str) -> Dict[str, Any] | None:
        """Load baseline from database."""
        if not self.db:
            return None

        try:
            collection = self.db['drift_baselines']
            baseline = collection.find_one({'model_id': model_id})

            if baseline:
                # Remove MongoDB _id
                baseline.pop('_id', None)
                return baseline
        except Exception as e:
            print(f"Warning: Failed to load baseline: {e}")

        return None

    def export_baseline(self, model_id: str, filepath: str) -> None:
        """
        Export baseline to JSON file.

        Args:
            model_id: Model identifier
            filepath: Output file path
        """
        baseline = self.get_baseline(model_id)
        if baseline:
            with open(filepath, 'w') as f:
                json.dump(baseline, f, indent=2)

    def import_baseline(self, filepath: str) -> Dict[str, Any]:
        """
        Import baseline from JSON file.

        Args:
            filepath: Input file path

        Returns:
            Imported baseline snapshot
        """
        with open(filepath, 'r') as f:
            baseline = json.load(f)

        # Store in database if available
        if self.db:
            self._store_baseline(baseline)

        # Cache
        self._cache[baseline['model_id']] = baseline

        return baseline
