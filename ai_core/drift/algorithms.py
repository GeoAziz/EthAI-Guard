"""
Drift Detection Algorithms

Implements Population Stability Index (PSI), KL divergence, Wasserstein distance,
and fairness drift metrics for monitoring model behavior in production.
"""
from typing import Dict, List, Tuple, Any
import numpy as np
from scipy import stats
from scipy.stats import wasserstein_distance


def compute_psi(
    baseline_hist: np.ndarray,
    current_hist: np.ndarray,
    epsilon: float = 1e-6
) -> float:
    """
    Compute Population Stability Index (PSI) between two distributions.

    PSI = sum((actual% - expected%) * ln(actual%/expected%))

    Thresholds:
    - PSI < 0.1: stable
    - 0.1 ≤ PSI < 0.25: warning
    - PSI ≥ 0.25: critical

    Args:
        baseline_hist: Expected distribution (baseline) counts
        current_hist: Actual distribution (current) counts
        epsilon: Smoothing factor to avoid division by zero

    Returns:
        PSI value (float)
    """
    # Normalize to percentages
    baseline_pct = (baseline_hist + epsilon) / (np.sum(baseline_hist) + epsilon * len(baseline_hist))
    current_pct = (current_hist + epsilon) / (np.sum(current_hist) + epsilon * len(current_hist))

    # PSI formula
    psi = np.sum((current_pct - baseline_pct) * np.log(current_pct / baseline_pct))

    return float(psi)


def compute_kl_divergence(
    baseline_hist: np.ndarray,
    current_hist: np.ndarray,
    epsilon: float = 1e-6
) -> float:
    """
    Compute Kullback-Leibler (KL) divergence between two distributions.

    KL = sum(P(x) * log(P(x)/Q(x)))

    Thresholds:
    - KL < 0.1: stable
    - 0.1 ≤ KL < 0.3: warning
    - KL ≥ 0.3: critical

    Args:
        baseline_hist: Reference distribution Q(x)
        current_hist: Test distribution P(x)
        epsilon: Smoothing factor

    Returns:
        KL divergence (float)
    """
    # Normalize to probabilities
    baseline_prob = (baseline_hist + epsilon) / (np.sum(baseline_hist) + epsilon * len(baseline_hist))
    current_prob = (current_hist + epsilon) / (np.sum(current_hist) + epsilon * len(current_hist))

    # KL divergence
    kl = np.sum(current_prob * np.log(current_prob / baseline_prob))

    return float(kl)


def compute_wasserstein_distance(
    baseline_values: np.ndarray,
    current_values: np.ndarray
) -> float:
    """
    Compute Wasserstein distance (Earth Mover's Distance) between two distributions.

    Measures the minimum "work" required to transform one distribution into another.
    More robust than KL divergence for distributions with different supports.

    Args:
        baseline_values: Baseline data points
        current_values: Current data points

    Returns:
        Wasserstein distance (float)
    """
    return float(wasserstein_distance(baseline_values, current_values))


def compute_histogram(
    values: np.ndarray,
    bins: int = 20,
    range_min: float | None = None,
    range_max: float | None = None
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Compute histogram with consistent binning.

    Args:
        values: Data points
        bins: Number of bins
        range_min: Minimum value for binning
        range_max: Maximum value for binning

    Returns:
        Tuple of (counts, bin_edges)
    """
    if range_min is None:
        range_min = float(np.min(values))
    if range_max is None:
        range_max = float(np.max(values))

    counts, bin_edges = np.histogram(values, bins=bins, range=(range_min, range_max))
    return counts, bin_edges


def classify_psi_severity(psi: float) -> str:
    """
    Classify PSI value into severity level.

    Args:
        psi: PSI value

    Returns:
        Severity: 'stable', 'warning', or 'critical'
    """
    if psi < 0.1:
        return 'stable'
    elif psi < 0.25:
        return 'warning'
    else:
        return 'critical'


def classify_kl_severity(kl: float) -> str:
    """
    Classify KL divergence into severity level.

    Args:
        kl: KL divergence value

    Returns:
        Severity: 'stable', 'warning', or 'critical'
    """
    if kl < 0.1:
        return 'stable'
    elif kl < 0.3:
        return 'warning'
    else:
        return 'critical'


def compute_fairness_drift(
    baseline_metrics: Dict[str, float],
    current_metrics: Dict[str, float]
) -> Dict[str, Any]:
    """
    Compute drift in fairness metrics.

    Tracks changes in:
    - Demographic Parity Difference (DPD)
    - Equal Opportunity Difference (EOD)
    - Disparate Impact Ratio

    Args:
        baseline_metrics: Baseline fairness scores
        current_metrics: Current fairness scores

    Returns:
        Dict with drift values and severities
    """
    result = {}

    # Demographic Parity Difference drift
    if 'demographic_parity_diff' in baseline_metrics and 'demographic_parity_diff' in current_metrics:
        dpd_drift = abs(current_metrics['demographic_parity_diff'] - baseline_metrics['demographic_parity_diff'])
        result['dpd_drift'] = dpd_drift
        result['dpd_severity'] = 'critical' if dpd_drift >= 0.1 else ('warning' if dpd_drift >= 0.05 else 'stable')

    # Equal Opportunity Difference drift
    if 'equal_opportunity_diff' in baseline_metrics and 'equal_opportunity_diff' in current_metrics:
        eod_drift = abs(current_metrics['equal_opportunity_diff'] - baseline_metrics['equal_opportunity_diff'])
        result['eod_drift'] = eod_drift
        result['eod_severity'] = 'critical' if eod_drift >= 0.1 else ('warning' if eod_drift >= 0.05 else 'stable')

    # Disparate Impact drift
    if 'disparate_impact' in baseline_metrics and 'disparate_impact' in current_metrics:
        di_drift = abs(current_metrics['disparate_impact'] - baseline_metrics['disparate_impact'])
        result['di_drift'] = di_drift
        result['di_severity'] = 'critical' if di_drift >= 0.15 else ('warning' if di_drift >= 0.08 else 'stable')

    return result


def compute_data_quality_drift(
    baseline_stats: Dict[str, Any],
    current_stats: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Compute data quality drift metrics.

    Tracks:
    - Null rate increases
    - New unseen categories
    - Feature value range changes

    Args:
        baseline_stats: Baseline data quality statistics
        current_stats: Current data quality statistics

    Returns:
        Dict with quality drift alerts
    """
    alerts = []

    # Null rate drift
    baseline_null_rates = baseline_stats.get('null_rates', {})
    current_null_rates = current_stats.get('null_rates', {})

    for feature in current_null_rates:
        if feature in baseline_null_rates:
            null_increase = current_null_rates[feature] - baseline_null_rates[feature]
            if null_increase >= 0.15:
                alerts.append({
                    'type': 'null_rate',
                    'feature': feature,
                    'severity': 'critical',
                    'baseline': baseline_null_rates[feature],
                    'current': current_null_rates[feature],
                    'increase': null_increase
                })
            elif null_increase >= 0.05:
                alerts.append({
                    'type': 'null_rate',
                    'feature': feature,
                    'severity': 'warning',
                    'baseline': baseline_null_rates[feature],
                    'current': current_null_rates[feature],
                    'increase': null_increase
                })

    # New unseen categories (categorical features)
    baseline_categories = baseline_stats.get('categories', {})
    current_categories = current_stats.get('categories', {})

    for feature in current_categories:
        if feature in baseline_categories:
            baseline_cats = set(baseline_categories[feature])
            current_cats = set(current_categories[feature])
            new_cats = current_cats - baseline_cats

            if new_cats:
                new_cat_proportion = len(new_cats) / len(current_cats) if current_cats else 0
                if new_cat_proportion >= 0.02:
                    alerts.append({
                        'type': 'new_categories',
                        'feature': feature,
                        'severity': 'warning',
                        'new_categories': list(new_cats),
                        'proportion': new_cat_proportion
                    })

    return {'alerts': alerts}


def compute_explanation_stability(
    baseline_explanations: List[np.ndarray],
    current_explanations: List[np.ndarray],
    threshold: float = 0.8
) -> Dict[str, Any]:
    """
    Compute stability of SHAP explanations for similar inputs.

    Uses cosine similarity between SHAP vectors to detect instability.

    Args:
        baseline_explanations: List of SHAP vectors from baseline
        current_explanations: List of SHAP vectors from current window
        threshold: Minimum average cosine similarity (default 0.8)

    Returns:
        Dict with stability metrics
    """
    if not baseline_explanations or not current_explanations:
        return {'stable': True, 'avg_similarity': 1.0}

    # Compute pairwise cosine similarities
    similarities = []
    for base_exp in baseline_explanations[:100]:  # Limit for performance
        for curr_exp in current_explanations[:100]:
            # Cosine similarity
            norm_base = np.linalg.norm(base_exp)
            norm_curr = np.linalg.norm(curr_exp)
            if norm_base > 0 and norm_curr > 0:
                similarity = np.dot(base_exp, curr_exp) / (norm_base * norm_curr)
                similarities.append(similarity)

    if not similarities:
        return {'stable': True, 'avg_similarity': 1.0}

    avg_similarity = float(np.mean(similarities))

    return {
        'stable': avg_similarity >= threshold,
        'avg_similarity': avg_similarity,
        'severity': 'critical' if avg_similarity < 0.6 else ('warning' if avg_similarity < threshold else 'stable')
    }


def aggregate_drift_metrics(
    feature_drifts: Dict[str, Dict[str, Any]],
    score_drift: Dict[str, Any],
    fairness_drift: Dict[str, Any],
    data_quality_drift: Dict[str, Any],
    explanation_stability: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Aggregate all drift metrics into summary.

    Args:
        feature_drifts: Per-feature drift metrics
        score_drift: Score distribution drift
        fairness_drift: Fairness metrics drift
        data_quality_drift: Data quality alerts
        explanation_stability: Explanation stability metrics

    Returns:
        Aggregated drift summary with overall status
    """
    # Count critical and warning alerts
    critical_count = 0
    warning_count = 0

    # Feature drifts
    for feature, metrics in feature_drifts.items():
        if metrics.get('psi_severity') == 'critical':
            critical_count += 1
        elif metrics.get('psi_severity') == 'warning':
            warning_count += 1

    # Score drift
    if score_drift.get('kl_severity') == 'critical':
        critical_count += 1
    elif score_drift.get('kl_severity') == 'warning':
        warning_count += 1

    # Fairness drift
    for key in fairness_drift:
        if key.endswith('_severity'):
            if fairness_drift[key] == 'critical':
                critical_count += 1
            elif fairness_drift[key] == 'warning':
                warning_count += 1

    # Data quality
    for alert in data_quality_drift.get('alerts', []):
        if alert['severity'] == 'critical':
            critical_count += 1
        elif alert['severity'] == 'warning':
            warning_count += 1

    # Explanation stability
    if explanation_stability.get('severity') == 'critical':
        critical_count += 1
    elif explanation_stability.get('severity') == 'warning':
        warning_count += 1

    # Determine overall status
    if critical_count > 0:
        overall_status = 'critical'
    elif warning_count > 0:
        overall_status = 'warning'
    else:
        overall_status = 'stable'

    return {
        'overall_status': overall_status,
        'critical_count': critical_count,
        'warning_count': warning_count,
        'feature_drifts': feature_drifts,
        'score_drift': score_drift,
        'fairness_drift': fairness_drift,
        'data_quality_drift': data_quality_drift,
        'explanation_stability': explanation_stability,
        'needs_retraining': critical_count >= 2  # Flag if 2+ critical alerts
    }
