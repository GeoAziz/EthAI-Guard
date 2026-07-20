"""
Advanced Drift Detection

Extends the baseline PSI/KL/Wasserstein detectors with:
- Multivariate drift (Mahalanobis distance + classifier two-sample test)
- Anomaly detection on current-window samples (Isolation Forest, Local Outlier Factor)
- Causal drift analysis (feature-target correlation/coefficient shift)
"""
from typing import Dict, List, Any
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score
from sklearn.covariance import EmpiricalCovariance


def compute_multivariate_drift(
    baseline_matrix: np.ndarray,
    current_matrix: np.ndarray
) -> Dict[str, Any]:
    """
    Detect multivariate distribution drift across several features jointly.

    Combines two signals:
    - Mahalanobis distance of the current-window centroid from the baseline
      distribution (captures joint mean/covariance shift).
    - A classifier two-sample test: train a classifier to distinguish
      baseline vs. current rows; AUC significantly above 0.5 means the two
      samples are separable, i.e. the joint distribution has drifted.

    Args:
        baseline_matrix: (n_baseline, n_features) array
        current_matrix: (n_current, n_features) array

    Returns:
        Dict with mahalanobis_distance, classifier_auc, severity
    """
    # Below this, the classifier two-sample test (cross-validated LogisticRegression)
    # trains on so little data per fold that its AUC is noise, not signal, yet the
    # severity thresholds below would still report it as a confident 'critical' drift.
    min_samples = 10
    if baseline_matrix.shape[0] < min_samples or current_matrix.shape[0] < min_samples:
        return {'error': 'Insufficient samples for multivariate drift'}

    if baseline_matrix.shape[1] != current_matrix.shape[1]:
        return {'error': 'Feature dimension mismatch'}

    # Mahalanobis distance of current centroid vs baseline distribution
    cov_estimator = EmpiricalCovariance().fit(baseline_matrix)
    current_centroid = np.mean(current_matrix, axis=0).reshape(1, -1)
    mahalanobis_distance = float(np.sqrt(cov_estimator.mahalanobis(current_centroid))[0])

    # Classifier two-sample test
    n_baseline = baseline_matrix.shape[0]
    n_current = current_matrix.shape[0]
    X = np.vstack([baseline_matrix, current_matrix])
    y = np.concatenate([np.zeros(n_baseline), np.ones(n_current)])

    n_splits = min(5, n_baseline, n_current)
    if n_splits >= 2:
        clf = LogisticRegression(max_iter=1000)
        scores = cross_val_score(clf, X, y, cv=n_splits, scoring='roc_auc')
        classifier_auc = float(np.mean(scores))
    else:
        classifier_auc = 0.5

    # Severity: combine both signals. AUC near 0.5 == indistinguishable == stable.
    auc_deviation = abs(classifier_auc - 0.5) * 2  # normalize to [0, 1]

    if auc_deviation >= 0.4 or mahalanobis_distance >= 3.0:
        severity = 'critical'
    elif auc_deviation >= 0.2 or mahalanobis_distance >= 1.5:
        severity = 'warning'
    else:
        severity = 'stable'

    return {
        'mahalanobis_distance': mahalanobis_distance,
        'classifier_auc': classifier_auc,
        'auc_deviation': auc_deviation,
        'severity': severity
    }


def detect_anomalies_isolation_forest(
    current_matrix: np.ndarray,
    contamination: float = 0.05,
    random_state: int = 42
) -> Dict[str, Any]:
    """
    Flag anomalous samples in the current window using Isolation Forest.

    Args:
        current_matrix: (n_samples, n_features) array of current window data
        contamination: Expected proportion of anomalies
        random_state: Random seed for reproducibility

    Returns:
        Dict with anomaly_count, anomaly_rate, anomaly_indices, severity
    """
    if current_matrix.shape[0] < 10:
        return {'error': 'Insufficient samples for anomaly detection'}

    model = IsolationForest(contamination=contamination, random_state=random_state)
    labels = model.fit_predict(current_matrix)  # -1 == anomaly, 1 == normal
    scores = model.decision_function(current_matrix)

    anomaly_indices = np.where(labels == -1)[0].tolist()
    anomaly_count = len(anomaly_indices)
    anomaly_rate = anomaly_count / current_matrix.shape[0]

    if anomaly_rate >= 0.15:
        severity = 'critical'
    elif anomaly_rate >= 0.08:
        severity = 'warning'
    else:
        severity = 'stable'

    return {
        'anomaly_count': anomaly_count,
        'anomaly_rate': anomaly_rate,
        'anomaly_indices': anomaly_indices,
        'min_score': float(np.min(scores)),
        'mean_score': float(np.mean(scores)),
        'severity': severity
    }


def detect_anomalies_lof(
    current_matrix: np.ndarray,
    n_neighbors: int = 20,
    contamination: float = 0.05
) -> Dict[str, Any]:
    """
    Flag anomalous samples in the current window using Local Outlier Factor.

    LOF is density-based and complements Isolation Forest by catching local
    outliers that sit in otherwise dense regions of the feature space.

    Args:
        current_matrix: (n_samples, n_features) array of current window data
        n_neighbors: Number of neighbors used for local density estimation
        contamination: Expected proportion of anomalies

    Returns:
        Dict with anomaly_count, anomaly_rate, anomaly_indices, severity
    """
    n_samples = current_matrix.shape[0]
    if n_samples < 10:
        return {'error': 'Insufficient samples for anomaly detection'}

    effective_neighbors = min(n_neighbors, n_samples - 1)
    model = LocalOutlierFactor(n_neighbors=effective_neighbors, contamination=contamination)
    labels = model.fit_predict(current_matrix)  # -1 == anomaly, 1 == normal
    negative_outlier_factor = model.negative_outlier_factor_

    anomaly_indices = np.where(labels == -1)[0].tolist()
    anomaly_count = len(anomaly_indices)
    anomaly_rate = anomaly_count / n_samples

    if anomaly_rate >= 0.15:
        severity = 'critical'
    elif anomaly_rate >= 0.08:
        severity = 'warning'
    else:
        severity = 'stable'

    return {
        'anomaly_count': anomaly_count,
        'anomaly_rate': anomaly_rate,
        'anomaly_indices': anomaly_indices,
        'mean_lof_score': float(np.mean(negative_outlier_factor)),
        'severity': severity
    }


def compute_causal_drift(
    baseline_features: np.ndarray,
    baseline_target: np.ndarray,
    current_features: np.ndarray,
    current_target: np.ndarray,
    feature_names: List[str] | None = None
) -> Dict[str, Any]:
    """
    Detect causal/relational drift: whether the relationship between
    features and the model's output/target has changed, as opposed to
    just the marginal distributions shifting.

    Approach: compare per-feature Pearson correlation with the target
    between baseline and current windows. A large change in correlation
    (sign flip or magnitude shift) indicates the causal structure driving
    predictions has shifted, which PSI/KL on marginals would miss.

    Args:
        baseline_features: (n_baseline, n_features) array
        baseline_target: (n_baseline,) array (e.g. risk_score)
        current_features: (n_current, n_features) array
        current_target: (n_current,) array
        feature_names: Optional names for each feature column

    Returns:
        Dict with per-feature correlation drift and overall severity
    """
    if baseline_features.shape[0] < 3 or current_features.shape[0] < 3:
        return {'error': 'Insufficient samples for causal drift analysis'}

    if baseline_features.shape[1] != current_features.shape[1]:
        return {'error': 'Feature dimension mismatch'}

    n_features = baseline_features.shape[1]
    if feature_names is None:
        feature_names = [f'feature_{i}' for i in range(n_features)]

    feature_drift = {}
    critical_count = 0
    warning_count = 0

    for i in range(n_features):
        base_col = baseline_features[:, i]
        curr_col = current_features[:, i]

        if np.std(base_col) == 0 or np.std(baseline_target) == 0:
            base_corr = 0.0
        else:
            base_corr = float(np.corrcoef(base_col, baseline_target)[0, 1])

        if np.std(curr_col) == 0 or np.std(current_target) == 0:
            curr_corr = 0.0
        else:
            curr_corr = float(np.corrcoef(curr_col, current_target)[0, 1])

        base_corr = 0.0 if np.isnan(base_corr) else base_corr
        curr_corr = 0.0 if np.isnan(curr_corr) else curr_corr

        corr_shift = abs(curr_corr - base_corr)
        sign_flip = (base_corr > 0.1 and curr_corr < -0.1) or (base_corr < -0.1 and curr_corr > 0.1)

        if corr_shift >= 0.4 or sign_flip:
            severity = 'critical'
            critical_count += 1
        elif corr_shift >= 0.2:
            severity = 'warning'
            warning_count += 1
        else:
            severity = 'stable'

        feature_drift[feature_names[i]] = {
            'baseline_correlation': base_corr,
            'current_correlation': curr_corr,
            'correlation_shift': corr_shift,
            'sign_flip': sign_flip,
            'severity': severity
        }

    if critical_count > 0:
        overall_severity = 'critical'
    elif warning_count > 0:
        overall_severity = 'warning'
    else:
        overall_severity = 'stable'

    return {
        'feature_drift': feature_drift,
        'critical_count': critical_count,
        'warning_count': warning_count,
        'severity': overall_severity
    }
