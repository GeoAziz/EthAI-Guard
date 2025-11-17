"""
Drift Detection Module

Provides algorithms and tools for detecting distribution drift
in model inputs and outputs.
"""

from .algorithms import (
    compute_psi,
    compute_kl_divergence,
    compute_wasserstein_distance,
    compute_histogram,
    classify_psi_severity,
    classify_kl_severity,
    compute_fairness_drift,
    compute_data_quality_drift,
    compute_explanation_stability,
    aggregate_drift_metrics
)
from .baseline import BaselineManager
from .alerts import AlertManager
from .worker import DriftWorker

__all__ = [
    'compute_psi',
    'compute_kl_divergence',
    'compute_wasserstein_distance',
    'compute_histogram',
    'classify_psi_severity',
    'classify_kl_severity',
    'compute_fairness_drift',
    'compute_data_quality_drift',
    'compute_explanation_stability',
    'aggregate_drift_metrics',
    'BaselineManager',
    'AlertManager',
    'DriftWorker'
]
